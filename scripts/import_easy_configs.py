#!/usr/bin/env python3
"""
Importa configurações do Easy Correspondente para o novo_amarante.

Escopo da importação:
- bancos
- agencias
- modalidades
- fluxos
- etapas
- situacoes
- documentos por fluxo/categoria
- vínculos banco_modalidades, fluxo_etapas e fluxo_documentos

Não importa:
- compradores / vendedores / construtoras / imóveis / imobiliárias / corretores / subestabelecidos
- processos / históricos

Observação importante:
- no sistema antigo a obrigatoriedade do documento parece ser configurada na vinculação
  com o fluxo; no novo_amarante hoje ela vive em `documentos_tipos`.
  Para não perder a operação, este importador preserva o valor existente quando já houver
  um documento igual na mesma categoria; quando for novo, assume `obrigatorio = true`.
"""

from __future__ import annotations

import argparse
import dataclasses
import html
import json
import re
import shlex
import socket
import subprocess
import sys
import time
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib import parse, request
import http.cookiejar


CATEGORY_MAP = {
    "MainContent_gwCompradorFis": "Comprador - Pessoa Física",
    "MainContent_gwCompradorJur": "Comprador - Pessoa Jurídica",
    "MainContent_gwVendedor": "Vendedor - Pessoa Física",
    "MainContent_gwVendedorJur": "Vendedor - Pessoa Jurídica",
    "MainContent_gwImovel": "Imóvel",
    "MainContent_gwFormulario": "Formulários",
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def digits(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


class HiddenFieldsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.fields: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "input" and attr_map.get("type") == "hidden" and attr_map.get("name"):
            self.fields[attr_map["name"]] = attr_map.get("value", "") or ""


class SelectOptionsParser(HTMLParser):
    def __init__(self, target_id: str) -> None:
        super().__init__()
        self.target_id = target_id
        self.capture = False
        self.current_value = ""
        self.current_text = ""
        self.current_selected = False
        self.options: list[tuple[str, str, bool]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "select" and attr_map.get("id") == self.target_id:
            self.capture = True
            return
        if self.capture and tag == "option":
            self.current_value = attr_map.get("value", "") or ""
            self.current_text = ""
            self.current_selected = "selected" in attr_map and bool(attr_map["selected"] or True)

    def handle_endtag(self, tag: str) -> None:
        if tag == "select" and self.capture:
            self.capture = False
        if self.capture and tag == "option":
            text = " ".join(html.unescape(self.current_text).split())
            self.options.append((self.current_value, text, self.current_selected))

    def handle_data(self, data: str) -> None:
        if self.capture:
            self.current_text += data


class FormStateParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.fields: dict[str, str] = {}
        self.current_select_name: str | None = None
        self.current_option_value = ""
        self.current_option_text = ""
        self.current_option_selected = False
        self.current_select_value: str | None = None
        self.current_select_first_value: str | None = None
        self.current_textarea_name: str | None = None
        self.current_textarea_value = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "input" and attr_map.get("name"):
            input_type = (attr_map.get("type") or "text").lower()
            if input_type in {"submit", "button", "image", "reset", "file"}:
                return
            if input_type in {"checkbox", "radio"}:
                if "checked" in attr_map:
                    self.fields[attr_map["name"]] = attr_map.get("value", "on") or "on"
                return
            self.fields[attr_map["name"]] = attr_map.get("value", "") or ""
            return

        if tag == "select" and attr_map.get("name"):
            self.current_select_name = attr_map["name"]
            self.current_select_value = None
            self.current_select_first_value = None
            return

        if self.current_select_name and tag == "option":
            self.current_option_value = attr_map.get("value", "") or ""
            self.current_option_text = ""
            self.current_option_selected = "selected" in attr_map and bool(attr_map["selected"] or True)
            if self.current_select_first_value is None:
                self.current_select_first_value = self.current_option_value
            return

        if tag == "textarea" and attr_map.get("name"):
            self.current_textarea_name = attr_map["name"]
            self.current_textarea_value = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "option" and self.current_select_name:
            if self.current_option_selected:
                self.current_select_value = self.current_option_value
            return

        if tag == "select" and self.current_select_name:
            self.fields[self.current_select_name] = self.current_select_value or self.current_select_first_value or ""
            self.current_select_name = None
            self.current_select_value = None
            self.current_select_first_value = None
            return

        if tag == "textarea" and self.current_textarea_name:
            self.fields[self.current_textarea_name] = self.current_textarea_value
            self.current_textarea_name = None
            self.current_textarea_value = ""

    def handle_data(self, data: str) -> None:
        if self.current_select_name:
            self.current_option_text += data
        if self.current_textarea_name:
            self.current_textarea_value += data


class TableParser(HTMLParser):
    def __init__(self, target_id: str) -> None:
        super().__init__()
        self.target_id = target_id
        self.depth = 0
        self.rows: list[list[str]] = []
        self.links: list[list[str | None]] = []
        self.current_row: list[str] = []
        self.current_links: list[str | None] = []
        self.in_cell = False
        self.cell = ""
        self.cell_link: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "table" and attr_map.get("id") == self.target_id and self.depth == 0:
            self.depth = 1
            return
        if self.depth == 0:
            return
        if tag == "table":
            self.depth += 1
        elif tag == "tr":
            self.current_row = []
            self.current_links = []
        elif tag in ("td", "th"):
            self.in_cell = True
            self.cell = ""
            self.cell_link = None
        elif tag == "a" and self.in_cell:
            self.cell_link = html.unescape(attr_map.get("href", "") or "")

    def handle_endtag(self, tag: str) -> None:
        if self.depth == 0:
            return
        if tag in ("td", "th") and self.in_cell:
            text = " ".join(html.unescape(self.cell).split())
            self.current_row.append(text)
            self.current_links.append(self.cell_link)
            self.in_cell = False
            self.cell_link = None
        elif tag == "tr":
            if any(cell for cell in self.current_row):
                self.rows.append(self.current_row)
                self.links.append(self.current_links)
        elif tag == "table":
            self.depth -= 1

    def handle_data(self, data: str) -> None:
        if self.depth and self.in_cell:
            self.cell += data


@dataclass
class OldBank:
    id: int
    name: str
    encaminhamento: str | None
    remuneracao: str | None
    modalities: list[str] = field(default_factory=list)


@dataclass
class OldAgency:
    bank_name: str
    name: str
    number: str | None


@dataclass
class OldModality:
    id: int
    name: str
    flow_name: str


@dataclass
class OldStage:
    name: str
    situation_name: str | None
    days: int | None
    important: bool | None


@dataclass
class OldFlowDoc:
    category: str
    order: int
    name: str


@dataclass
class OldFlow:
    id: int
    name: str
    stages: list[tuple[int, str]] = field(default_factory=list)
    documents: list[OldFlowDoc] = field(default_factory=list)


class EasyClient:
    def __init__(self, base_url: str, username: str, password: str, verbose: bool = False) -> None:
        self.base_url = base_url.rstrip("/")
        self.login_url = f"{self.base_url}/Login?ReturnUrl=%2fDefault"
        self.username = username
        self.password = password
        self.headers = {"User-Agent": "Mozilla/5.0"}
        self.cookiejar = http.cookiejar.CookieJar()
        self.opener = request.build_opener(request.HTTPCookieProcessor(self.cookiejar))
        self.verbose = verbose

    def log(self, message: str) -> None:
        if self.verbose:
            print(message, file=sys.stderr, flush=True)

    def _open(self, url: str, data: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> str:
        encoded = None
        headers = dict(self.headers)
        if extra_headers:
            headers.update(extra_headers)
        if data is not None:
            encoded = parse.urlencode(data).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        attempts = 3
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            self.log(f"[easy] {'POST' if data is not None else 'GET '} {url} (tentativa {attempt}/{attempts})")
            req = request.Request(url, data=encoded, headers=headers)
            try:
                with self.opener.open(req, timeout=60) as resp:
                    return resp.read().decode("utf-8", "ignore")
            except (socket.timeout, TimeoutError, request.URLError) as exc:
                last_error = exc
                if attempt == attempts:
                    break
                time.sleep(2 * attempt)
        if last_error:
            raise last_error
        raise RuntimeError(f"Falha inesperada ao acessar {url}")

    def login(self) -> None:
        login_page = self._open(self.login_url)
        hidden = self.hidden_fields(login_page)
        hidden.update(
            {
                "txtUsuario": self.username,
                "txtSenha": self.password,
                "btnCadastrar": "Entrar",
                "__EVENTTARGET": "btnCadastrar",
                "__EVENTARGUMENT": "",
            }
        )
        self._open(self.login_url, hidden)

    @staticmethod
    def hidden_fields(page: str) -> dict[str, str]:
        parser = HiddenFieldsParser()
        parser.feed(page)
        return dict(parser.fields)

    @staticmethod
    def form_state(page: str) -> dict[str, str]:
        parser = FormStateParser()
        parser.feed(page)
        return dict(parser.fields)

    @staticmethod
    def select_options(page: str, select_id: str) -> list[tuple[str, str, bool]]:
        parser = SelectOptionsParser(select_id)
        parser.feed(page)
        return parser.options

    @staticmethod
    def parse_table(page: str, table_id: str) -> tuple[list[list[str]], list[list[str | None]]]:
        parser = TableParser(table_id)
        parser.feed(page)
        return parser.rows, parser.links

    def get(self, path: str) -> str:
        return self._open(f"{self.base_url}/{path.lstrip('/')}")

    def post(self, path: str, form: dict[str, Any]) -> str:
        return self._open(f"{self.base_url}/{path.lstrip('/')}", form)

    def post_update_panel(self, path: str, form: dict[str, Any], event_target: str, panel_id: str) -> str:
        async_form = dict(form)
        async_form["ctl00$ScriptManager1"] = f"{panel_id}|{event_target}"
        async_form["__ASYNCPOST"] = "true"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-MicrosoftAjax": "Delta=true",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{self.base_url}/{path.lstrip('/')}",
        }
        return self._open(f"{self.base_url}/{path.lstrip('/')}", async_form, headers)

    def search_stage(self, stage_name: str) -> int | None:
        page = self.get("Etapa.aspx")
        form = self.hidden_fields(page)
        form["ctl00$MainContent$txtDesc"] = stage_name
        form["ctl00$MainContent$ddlSituacao"] = ""
        form["ctl00$MainContent$btnPesquisar"] = "Pesquisar"
        result = self.post("Etapa.aspx", form)
        rows, links = self.parse_table(result, "MainContent_gwDados")
        for row, row_links in zip(rows, links):
            if len(row) >= 2 and normalize(row[1]) == normalize(stage_name):
                link = next((l for l in row_links if l and "EtapaManter.aspx?id=" in l), None)
                if link:
                    match = re.search(r"id=(\d+)", link)
                    if match:
                        return int(match.group(1))
        return None


def parse_checked(page: str, element_id: str) -> bool:
    return bool(re.search(rf'id="{re.escape(element_id)}"[^>]*checked="checked"', page, re.I))


def parse_input_value(page: str, element_id: str) -> str | None:
    match = re.search(rf'id="{re.escape(element_id)}"[^>]*value="([^"]*)"', page, re.I)
    return html.unescape(match.group(1)) if match else None


def parse_selected_label(page: str, select_id: str) -> str | None:
    options = EasyClient.select_options(page, select_id)
    for _value, text, selected in options:
        if selected:
            return text
    return None


def parse_bank_modalities(page: str) -> list[str]:
    rows, _ = EasyClient.parse_table(page, "MainContent_gwDados")
    found: list[str] = []
    for row in rows[1:]:
        if len(row) >= 3 and row[1] and row[1] not in {"1", "2", "3"}:
            found.append(row[1])
    return found


def parse_flow_stages(page: str) -> list[tuple[int, str]]:
    rows, _ = EasyClient.parse_table(page, "MainContent_gwDados")
    stages: list[tuple[int, str]] = []
    for row in rows[1:]:
        if len(row) >= 5:
            non_empty = [cell for cell in row if cell]
            if len(non_empty) >= 2 and non_empty[-1].isdigit():
                stages.append((int(non_empty[-1]), non_empty[-2]))
    return stages


def parse_flow_documents(page: str) -> list[OldFlowDoc]:
    docs: list[OldFlowDoc] = []
    for table_id, category in CATEGORY_MAP.items():
        rows, _ = EasyClient.parse_table(page, table_id)
        for row in rows[1:]:
            non_empty = [cell for cell in row if cell]
            if len(non_empty) >= 2 and non_empty[-2].isdigit():
                docs.append(OldFlowDoc(category=category, order=int(non_empty[-2]), name=non_empty[-1]))
    return docs


def parse_agencies(page: str) -> list[OldAgency]:
    rows, _ = EasyClient.parse_table(page, "MainContent_gwDados")
    agencies: list[OldAgency] = []
    for row in rows[1:]:
        if len(row) < 5:
            continue
        if (row[0] or "").strip() or (row[1] or "").strip():
            continue
        name = (row[2] or "").strip()
        bank_name = (row[3] or "").strip()
        number = (row[4] or "").strip() or None
        if not name or not bank_name:
            continue
        if name == "Nome da Agência" or bank_name == "Banco":
            continue
        agencies.append(OldAgency(bank_name=bank_name, name=name, number=number))
    return agencies


def parse_grid_page_links(page: str, event_target: str) -> list[int]:
    pattern = re.compile(
        rf"__doPostBack\(&#39;{re.escape(event_target)}&#39;,&#39;Page\$(\d+)&#39;\)",
        re.I,
    )
    return sorted({int(match.group(1)) for match in pattern.finditer(page)})


def scrape_agencies_for_bank(client: EasyClient, bank_id: int, bank_name: str) -> list[OldAgency]:
    search_page = client.get("Agencia")
    form = client.form_state(search_page)
    form["ctl00$MainContent$ddlBanco"] = str(bank_id)
    form["ctl00$MainContent$btnPesquisar"] = "Pesquisar"
    filtered_page = client.post("Agencia", form)
    agencies = parse_agencies(filtered_page)
    total_pages = max(parse_grid_page_links(filtered_page, "ctl00$MainContent$gwDados"), default=1)

    for page_number in range(2, total_pages + 1):
        client.log(f"[easy] lendo página {page_number} de agências do banco {bank_name}")
        page_form = client.form_state(filtered_page)
        page_form["__EVENTTARGET"] = "ctl00$MainContent$gwDados"
        page_form["__EVENTARGUMENT"] = f"Page${page_number}"
        next_page = client.post_update_panel(
            "Agencia",
            page_form,
            event_target="ctl00$MainContent$gwDados",
            panel_id="MainContent_upnlGeral",
        )
        agencies.extend(parse_agencies(next_page))

    unique_agencies: dict[tuple[str, str, str | None], OldAgency] = {}
    for agency in agencies:
        key = (agency.bank_name, agency.name, agency.number)
        unique_agencies[key] = agency
    return sorted(unique_agencies.values(), key=lambda item: (item.bank_name, item.name, item.number or ""))


def scrape_old_config(base_url: str, username: str, password: str, verbose: bool = False) -> dict[str, Any]:
    client = EasyClient(base_url, username, password, verbose=verbose)
    client.login()

    agency_page = client.get("Agencia")
    bank_options = [
        (int(value), text)
        for value, text, _selected in client.select_options(agency_page, "MainContent_ddlBanco")
        if value and text
    ]
    if not bank_options:
        raise RuntimeError("Não foi possível descobrir os bancos ativos no sistema antigo.")

    banks: list[OldBank] = []
    modality_options_map: dict[str, int] = {}
    for bank_id, bank_name in bank_options:
        client.log(f"[easy] lendo banco {bank_name} (id {bank_id})")
        page = client.get(f"BancoManter.aspx?id={bank_id}&tp=1")
        if not page:
            continue
        if bank_name not in page:
            # se o id do combo não abrir a manutenção esperada, seguimos sem quebrar a migração
            continue
        for value, text, _selected in client.select_options(page, "MainContent_ddlModalidade"):
            if value and text:
                modality_options_map[text] = int(value)
        banks.append(
            OldBank(
                id=bank_id,
                name=parse_input_value(page, "MainContent_txtNome") or bank_name,
                encaminhamento=parse_selected_label(page, "MainContent_ddlEncaminhamento"),
                remuneracao=parse_input_value(page, "MainContent_txtRemuneracao"),
                modalities=parse_bank_modalities(page),
            )
        )

    agencies: list[OldAgency] = []
    for bank_id, bank_name in bank_options:
        client.log(f"[easy] lendo agências do banco {bank_name} (id {bank_id})")
        agencies.extend(scrape_agencies_for_bank(client, bank_id, bank_name))

    unique_agencies: dict[tuple[str, str, str | None], OldAgency] = {}
    for agency in agencies:
        key = (agency.bank_name, agency.name, agency.number)
        unique_agencies[key] = agency
    agencies = sorted(unique_agencies.values(), key=lambda item: (item.bank_name, item.name, item.number or ""))

    active_modality_names = sorted({name for bank in banks for name in bank.modalities})
    modalities: list[OldModality] = []
    flow_options_map: dict[str, int] = {}
    for modality_name in active_modality_names:
        client.log(f"[easy] lendo modalidade {modality_name}")
        modality_id = modality_options_map.get(modality_name)
        if not modality_id:
            continue
        page = client.get(f"ModalidadeManter.aspx?id={modality_id}&tp=1")
        for value, text, _selected in client.select_options(page, "MainContent_ddlFluxo"):
            if value and text:
                flow_options_map[text] = int(value)
        flow_name = parse_selected_label(page, "MainContent_ddlFluxo") or ""
        if flow_name:
            modalities.append(OldModality(id=modality_id, name=modality_name, flow_name=flow_name))

    active_flow_names = sorted({modality.flow_name for modality in modalities if modality.flow_name})
    flows: list[OldFlow] = []
    unique_stage_names: set[str] = set()
    for flow_name in active_flow_names:
        client.log(f"[easy] lendo fluxo {flow_name}")
        flow_id = flow_options_map.get(flow_name)
        if not flow_id:
            continue
        config_page = client.get(f"ConfigurarFluxo.aspx?id={flow_id}&tp=1")
        docs_page = client.get(f"ItemDocumentacao.aspx?id={flow_id}&tp=1")
        stages = parse_flow_stages(config_page)
        unique_stage_names.update(stage_name for _order, stage_name in stages)
        flows.append(OldFlow(id=flow_id, name=flow_name, stages=stages, documents=parse_flow_documents(docs_page)))

    stages: list[OldStage] = []
    etapa_page = client.get("Etapa.aspx")
    situation_options = client.select_options(etapa_page, "MainContent_ddlSituacao")
    situation_order_options = {text: index + 1 for index, (_value, text, _selected) in enumerate(situation_options) if text}
    etapa_rows, _ = client.parse_table(etapa_page, "MainContent_gwDados")
    stage_summary_map: dict[str, dict[str, Any]] = {}
    for row in etapa_rows[1:]:
        non_empty = [cell for cell in row if cell]
        if len(non_empty) >= 3 and not non_empty[0].isdigit():
            stage_summary_map[normalize(non_empty[0])] = {
                "name": non_empty[0],
                "situation_name": non_empty[1] if len(non_empty) > 1 else None,
                "days": int(non_empty[2]) if len(non_empty) > 2 and non_empty[2].isdigit() else None,
            }
    for stage_name in sorted(unique_stage_names):
        client.log(f"[easy] consolidando etapa {stage_name}")
        summary = stage_summary_map.get(normalize(stage_name), {})
        stages.append(
            OldStage(
                name=summary.get("name") or stage_name,
                situation_name=summary.get("situation_name"),
                days=summary.get("days"),
                important=None,
            )
        )

    used_doc_pairs = sorted(
        {
            (doc.category, doc.name)
            for flow in flows
            for doc in flow.documents
        }
    )

    return {
        "banks": [dataclasses.asdict(bank) for bank in banks],
        "agencies": [dataclasses.asdict(agency) for agency in agencies],
        "modalities": [dataclasses.asdict(modality) for modality in modalities],
        "flows": [
            {
                "id": flow.id,
                "name": flow.name,
                "stages": [{"order": order, "name": name} for order, name in flow.stages],
                "documents": [dataclasses.asdict(doc) for doc in flow.documents],
            }
            for flow in flows
        ],
        "stages": [dataclasses.asdict(stage) for stage in stages],
        "situations": [
            {"name": name, "order": order}
            for name, order in sorted(situation_order_options.items(), key=lambda item: item[1])
        ],
        "documents_used": [{"category": category, "name": name} for category, name in used_doc_pairs],
    }


def ssh_base_command(args: argparse.Namespace) -> list[str]:
    cmd = ["ssh", "-i", args.ssh_key]
    if args.ssh_known_hosts:
        cmd.extend(["-o", f"UserKnownHostsFile={args.ssh_known_hosts}"])
    cmd.extend(["-o", "StrictHostKeyChecking=no", f"{args.ssh_user}@{args.ssh_host}"])
    return cmd


def remote_mysql_tsv(args: argparse.Namespace, query: str) -> list[list[str]]:
    mysql_cmd = (
        f"mysql -N -B -u{args.db_user} -p'{args.db_pass}' -D {args.db_name} -e {shlex.quote(query)}"
    )
    ssh_cmd = ssh_base_command(args) + [mysql_cmd]
    proc = subprocess.run(ssh_cmd, capture_output=True, text=True, check=True)
    rows: list[list[str]] = []
    for line in proc.stdout.splitlines():
        rows.append(line.split("\t"))
    return rows


def remote_exec(args: argparse.Namespace, command: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(ssh_base_command(args) + [command], capture_output=True, text=True, check=True)


def current_state(args: argparse.Namespace) -> dict[str, Any]:
    state: dict[str, Any] = {}

    state["bancos"] = [
        {"id": int(row[0]), "nome": row[1], "encaminhamento": row[2] or None, "remuneracao": row[3] or None}
        for row in remote_mysql_tsv(args, "SELECT id,nome,IFNULL(encaminhamento,''),IFNULL(remuneracao,'') FROM bancos")
    ]
    state["agencias"] = [
        {"id": int(row[0]), "banco_id": int(row[1]), "nome": row[2], "codigo": row[3] or None}
        for row in remote_mysql_tsv(args, "SELECT id,banco_id,nome,IFNULL(codigo,'') FROM agencias")
    ]
    state["modalidades"] = [
        {"id": int(row[0]), "nome": row[1], "fluxo_id": int(row[2]) if row[2] else None}
        for row in remote_mysql_tsv(args, "SELECT id,nome,IFNULL(fluxo_id,'') FROM modalidades")
    ]
    state["fluxos"] = [
        {"id": int(row[0]), "nome": row[1]}
        for row in remote_mysql_tsv(args, "SELECT id,nome FROM fluxos")
    ]
    state["situacoes"] = [
        {"id": int(row[0]), "nome": row[1], "ordem": int(row[2] or 0)}
        for row in remote_mysql_tsv(args, "SELECT id,nome,IFNULL(ordem,0) FROM situacoes")
    ]
    state["etapas"] = [
        {
            "id": int(row[0]),
            "nome": row[1],
            "situacao_id": int(row[2]) if row[2] else None,
            "tolerancia": int(row[3] or 0),
            "importante": row[4] == "1",
            "ativo": row[5] == "1",
        }
        for row in remote_mysql_tsv(args, "SELECT id,nome,IFNULL(situacao_id,''),IFNULL(tolerancia,0),IFNULL(importante,0),IFNULL(ativo,1) FROM etapas")
    ]
    state["documentos_tipos"] = [
        {
            "id": int(row[0]),
            "nome": row[1],
            "categoria": row[2],
            "obrigatorio": row[3] == "1",
        }
        for row in remote_mysql_tsv(args, "SELECT id,nome,categoria,IFNULL(obrigatorio,0) FROM documentos_tipos")
    ]
    return state


def find_match(rows: list[dict[str, Any]], name: str, key: str = "nome") -> dict[str, Any] | None:
    normalized = normalize(name)
    for row in rows:
        if normalize(str(row.get(key, ""))) == normalized:
            return row
    return None


def build_sql(old: dict[str, Any], state: dict[str, Any]) -> tuple[str, dict[str, int], dict[str, Any]]:
    statements: list[str] = ["SET FOREIGN_KEY_CHECKS=0;", "START TRANSACTION;"]

    report: dict[str, Any] = {
        "bancos": {"updated": 0, "inserted": 0},
        "agencias": {"updated": 0, "inserted": 0},
        "situacoes": {"updated": 0, "inserted": 0},
        "etapas": {"updated": 0, "inserted": 0},
        "fluxos": {"updated": 0, "inserted": 0},
        "modalidades": {"updated": 0, "inserted": 0},
        "documentos": {"updated": 0, "inserted": 0},
        "banco_modalidades": 0,
        "fluxo_etapas": 0,
        "fluxo_documentos": 0,
    }

    ids: dict[str, dict[str, int]] = {
        "bancos": {},
        "fluxos": {},
        "situacoes": {},
        "etapas": {},
        "modalidades": {},
        "documentos": {},
    }

    # fluxos
    next_flow_id = max((row["id"] for row in state["fluxos"]), default=0) + 1
    for flow in old["flows"]:
        existing = find_match(state["fluxos"], flow["name"])
        if existing:
            ids["fluxos"][flow["name"]] = existing["id"]
            statements.append(
                f"UPDATE fluxos SET nome={sql_str(flow['name'])}, ativo=1 WHERE id={existing['id']};"
            )
            report["fluxos"]["updated"] += 1
        else:
            flow_id = next_flow_id
            next_flow_id += 1
            ids["fluxos"][flow["name"]] = flow_id
            statements.append(
                f"INSERT INTO fluxos (id,nome,ativo) VALUES ({flow_id},{sql_str(flow['name'])},1);"
            )
            state["fluxos"].append({"id": flow_id, "nome": flow["name"]})
            report["fluxos"]["inserted"] += 1

    # situações
    next_situation_id = max((row["id"] for row in state["situacoes"]), default=0) + 1
    for situation in old["situations"]:
        existing = find_match(state["situacoes"], situation["name"])
        if existing:
            ids["situacoes"][situation["name"]] = existing["id"]
            statements.append(
                f"UPDATE situacoes SET nome={sql_str(situation['name'])}, ordem={situation['order']}, ativo=1 WHERE id={existing['id']};"
            )
            report["situacoes"]["updated"] += 1
        else:
            situation_id = next_situation_id
            next_situation_id += 1
            ids["situacoes"][situation["name"]] = situation_id
            statements.append(
                f"INSERT INTO situacoes (id,nome,ordem,ativo) VALUES ({situation_id},{sql_str(situation['name'])},{situation['order']},1);"
            )
            state["situacoes"].append({"id": situation_id, "nome": situation["name"], "ordem": situation["order"]})
            report["situacoes"]["inserted"] += 1

    # bancos
    next_bank_id = max((row["id"] for row in state["bancos"]), default=0) + 1
    for bank in old["banks"]:
        existing = find_match(state["bancos"], bank["name"])
        if existing:
            bank_id = existing["id"]
            ids["bancos"][bank["name"]] = bank_id
            statements.append(
                "UPDATE bancos "
                f"SET nome={sql_str(bank['name'])}, encaminhamento={sql_str(bank['encaminhamento'])}, "
                f"remuneracao={sql_str((bank['remuneracao'] or '').replace('.', '').replace(',', '.') if bank['remuneracao'] else None)}, ativo=1 "
                f"WHERE id={bank_id};"
            )
            report["bancos"]["updated"] += 1
        else:
            bank_id = next_bank_id
            next_bank_id += 1
            ids["bancos"][bank["name"]] = bank_id
            remuneracao = (bank["remuneracao"] or "").replace(".", "").replace(",", ".") if bank["remuneracao"] else None
            statements.append(
                "INSERT INTO bancos (id,nome,encaminhamento,remuneracao,ativo) "
                f"VALUES ({bank_id},{sql_str(bank['name'])},{sql_str(bank['encaminhamento'])},{sql_str(remuneracao)},1);"
            )
            state["bancos"].append({"id": bank_id, "nome": bank["name"], "encaminhamento": bank["encaminhamento"], "remuneracao": remuneracao})
            report["bancos"]["inserted"] += 1

    # modalidades
    next_modality_id = max((row["id"] for row in state["modalidades"]), default=0) + 1
    for modality in old["modalities"]:
        flow_id = ids["fluxos"].get(modality["flow_name"])
        existing = find_match(state["modalidades"], modality["name"])
        if existing:
            modality_id = existing["id"]
            ids["modalidades"][modality["name"]] = modality_id
            statements.append(
                f"UPDATE modalidades SET nome={sql_str(modality['name'])}, fluxo_id={flow_id if flow_id else 'NULL'}, ativo=1 WHERE id={modality_id};"
            )
            report["modalidades"]["updated"] += 1
        else:
            modality_id = next_modality_id
            next_modality_id += 1
            ids["modalidades"][modality["name"]] = modality_id
            statements.append(
                f"INSERT INTO modalidades (id,nome,fluxo_id,ativo) VALUES ({modality_id},{sql_str(modality['name'])},{flow_id if flow_id else 'NULL'},1);"
            )
            state["modalidades"].append({"id": modality_id, "nome": modality["name"], "fluxo_id": flow_id})
            report["modalidades"]["inserted"] += 1

    # etapas
    next_stage_id = max((row["id"] for row in state["etapas"]), default=0) + 1
    old_stage_lookup = {stage["name"]: stage for stage in old["stages"]}
    for stage in old["stages"]:
        existing = find_match(state["etapas"], stage["name"])
        situation_id = ids["situacoes"].get(stage["situation_name"] or "")
        effective_days = stage["days"]
        effective_important = stage["important"]
        effective_situation_id = situation_id
        if existing:
            if effective_days is None:
                effective_days = existing["tolerancia"]
            if effective_important is None:
                effective_important = existing["importante"]
            if effective_situation_id is None:
                effective_situation_id = existing["situacao_id"]
        if existing:
            stage_id = existing["id"]
            ids["etapas"][stage["name"]] = stage_id
            statements.append(
                f"UPDATE etapas SET nome={sql_str(stage['name'])}, fluxo_id=NULL, ordem=0, "
                f"tolerancia={effective_days if effective_days is not None else 'NULL'}, "
                f"situacao_id={effective_situation_id if effective_situation_id else 'NULL'}, importante={1 if effective_important else 0}, ativo=1 "
                f"WHERE id={stage_id};"
            )
            report["etapas"]["updated"] += 1
        else:
            stage_id = next_stage_id
            next_stage_id += 1
            ids["etapas"][stage["name"]] = stage_id
            statements.append(
                "INSERT INTO etapas (id,fluxo_id,nome,ordem,tolerancia,situacao_id,importante,atendente,externo,ativo) "
                f"VALUES ({stage_id},NULL,{sql_str(stage['name'])},0,{effective_days if effective_days is not None else 'NULL'},"
                f"{effective_situation_id if effective_situation_id else 'NULL'},{1 if effective_important else 0},0,0,1);"
            )
            state["etapas"].append(
                {
                    "id": stage_id,
                    "nome": stage["name"],
                    "situacao_id": effective_situation_id,
                    "tolerancia": effective_days or 0,
                    "importante": bool(effective_important),
                    "ativo": True,
                }
            )
            report["etapas"]["inserted"] += 1

    # documentos: materializa por nome + categoria
    next_doc_id = max((row["id"] for row in state["documentos_tipos"]), default=0) + 1
    existing_doc_map = {
        (normalize(row["categoria"]), normalize(row["nome"])): row
        for row in state["documentos_tipos"]
    }
    for doc in old["documents_used"]:
        key = (normalize(doc["category"]), normalize(doc["name"]))
        existing = existing_doc_map.get(key)
        inferred_required = existing["obrigatorio"] if existing else True
        if existing:
            doc_id = existing["id"]
            ids["documentos"][f"{doc['category']}::{doc['name']}"] = doc_id
            statements.append(
                f"UPDATE documentos_tipos SET nome={sql_str(doc['name'])}, categoria={sql_str(doc['category'])}, "
                f"obrigatorio={1 if inferred_required else 0}, ativo=1 WHERE id={doc_id};"
            )
            report["documentos"]["updated"] += 1
        else:
            doc_id = next_doc_id
            next_doc_id += 1
            ids["documentos"][f"{doc['category']}::{doc['name']}"] = doc_id
            statements.append(
                "INSERT INTO documentos_tipos (id,fluxo_id,nome,categoria,ordem,obrigatorio,ativo) "
                f"VALUES ({doc_id},NULL,{sql_str(doc['name'])},{sql_str(doc['category'])},0,{1 if inferred_required else 0},1);"
            )
            state["documentos_tipos"].append(
                {"id": doc_id, "nome": doc["name"], "categoria": doc["category"], "obrigatorio": inferred_required}
            )
            existing_doc_map[key] = state["documentos_tipos"][-1]
            report["documentos"]["inserted"] += 1

    # agências
    next_agency_id = max((row["id"] for row in state["agencias"]), default=0) + 1
    for agency in old["agencies"]:
        bank_id = ids["bancos"].get(agency["bank_name"])
        if not bank_id:
            continue
        exact = next(
            (
                row
                for row in state["agencias"]
                if row["banco_id"] == bank_id and normalize(row["nome"]) == normalize(agency["name"])
            ),
            None,
        )
        if exact is None:
            old_digits = digits(agency["number"] or "")
            if old_digits:
                exact = next(
                    (
                        row
                        for row in state["agencias"]
                        if row["banco_id"] == bank_id and digits(row["codigo"] or "") == old_digits
                    ),
                    None,
                )
        if exact:
            statements.append(
                f"UPDATE agencias SET banco_id={bank_id}, nome={sql_str(agency['name'])}, codigo={sql_str(agency['number'])}, ativo=1 WHERE id={exact['id']};"
            )
            report["agencias"]["updated"] += 1
        else:
            agency_id = next_agency_id
            next_agency_id += 1
            statements.append(
                f"INSERT INTO agencias (id,banco_id,nome,codigo,ativo) VALUES ({agency_id},{bank_id},{sql_str(agency['name'])},{sql_str(agency['number'])},1);"
            )
            state["agencias"].append({"id": agency_id, "banco_id": bank_id, "nome": agency["name"], "codigo": agency["number"]})
            report["agencias"]["inserted"] += 1

    # junctions: limpa apenas o escopo importado
    imported_bank_ids = sorted(ids["bancos"][bank["name"]] for bank in old["banks"] if bank["name"] in ids["bancos"])
    if imported_bank_ids:
        statements.append(
            f"DELETE FROM banco_modalidades WHERE banco_id IN ({','.join(str(bank_id) for bank_id in imported_bank_ids)});"
        )
        for bank in old["banks"]:
            bank_id = ids["bancos"].get(bank["name"])
            if not bank_id:
                continue
            seen_modalities: set[int] = set()
            for modality_name in bank["modalities"]:
                modality_id = ids["modalidades"].get(modality_name)
                if modality_id and modality_id not in seen_modalities:
                    statements.append(
                        f"INSERT INTO banco_modalidades (banco_id,modalidade_id) VALUES ({bank_id},{modality_id});"
                    )
                    report["banco_modalidades"] += 1
                    seen_modalities.add(modality_id)

    imported_flow_ids = sorted(ids["fluxos"][flow["name"]] for flow in old["flows"] if flow["name"] in ids["fluxos"])
    if imported_flow_ids:
        statements.append(
            f"DELETE FROM fluxo_etapas WHERE fluxo_id IN ({','.join(str(flow_id) for flow_id in imported_flow_ids)});"
        )
        statements.append(
            f"DELETE FROM fluxo_documentos WHERE fluxo_id IN ({','.join(str(flow_id) for flow_id in imported_flow_ids)});"
        )
        for flow in old["flows"]:
            flow_id = ids["fluxos"].get(flow["name"])
            if not flow_id:
                continue
            seen_stage_ids: set[int] = set()
            for stage in flow["stages"]:
                stage_id = ids["etapas"].get(stage["name"])
                if stage_id and stage_id not in seen_stage_ids:
                    statements.append(
                        f"INSERT INTO fluxo_etapas (fluxo_id,etapa_id,ordem) VALUES ({flow_id},{stage_id},{stage['order']});"
                    )
                    report["fluxo_etapas"] += 1
                    seen_stage_ids.add(stage_id)
            seen_doc_links: set[tuple[int, str]] = set()
            for doc in flow["documents"]:
                doc_id = ids["documentos"].get(f"{doc['category']}::{doc['name']}")
                category_key = normalize(doc["category"])
                link_key = (doc_id, category_key) if doc_id else None
                if doc_id and link_key not in seen_doc_links:
                    statements.append(
                        "INSERT INTO fluxo_documentos (fluxo_id,documento_tipo_id,categoria,ordem) "
                        f"VALUES ({flow_id},{doc_id},{sql_str(doc['category'])},{doc['order']});"
                    )
                    report["fluxo_documentos"] += 1
                    seen_doc_links.add(link_key)

    statements.extend(["COMMIT;", "SET FOREIGN_KEY_CHECKS=1;"])
    return "\n".join(statements) + "\n", {k: v for k, v in ids.items() if isinstance(v, dict)}, report


def backup_current_config(args: argparse.Namespace, backup_name: str) -> str:
    remote_path = f"{args.backup_dir.rstrip('/')}/{backup_name}"
    tables = " ".join(
        [
            "bancos",
            "agencias",
            "modalidades",
            "fluxos",
            "situacoes",
            "etapas",
            "documentos_tipos",
            "banco_modalidades",
            "fluxo_etapas",
            "fluxo_documentos",
        ]
    )
    command = (
        f"mkdir -p {args.backup_dir.rstrip('/')} && "
        f"mysqldump -u{args.db_user} -p'{args.db_pass}' {args.db_name} {tables} > {remote_path} && "
        f"echo {remote_path}"
    )
    result = remote_exec(args, command)
    return result.stdout.strip().splitlines()[-1]


def apply_sql(args: argparse.Namespace, sql_text: str) -> None:
    remote_path = f"/tmp/novo_amarante_import_{args.run_tag}.sql"
    temp_path = Path(f"/tmp/novo_amarante_import_{args.run_tag}.sql")
    temp_path.write_text(sql_text, encoding="utf-8")
    try:
        subprocess.run(
            [
                "scp",
                "-i",
                args.ssh_key,
                "-o",
                "StrictHostKeyChecking=no",
                "-o",
                f"UserKnownHostsFile={args.ssh_known_hosts}",
                str(temp_path),
                f"{args.ssh_user}@{args.ssh_host}:{remote_path}",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        remote_exec(
            args,
            f"mysql -u{args.db_user} -p'{args.db_pass}' -D {args.db_name} < {remote_path} && rm -f {remote_path}",
        )
    finally:
        if temp_path.exists():
            temp_path.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa configurações do Easy Correspondente para o novo_amarante.")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--ssh-host", required=True)
    parser.add_argument("--ssh-user", required=True)
    parser.add_argument("--ssh-key", required=True)
    parser.add_argument("--ssh-known-hosts", required=True)
    parser.add_argument("--db-name", required=True)
    parser.add_argument("--db-user", required=True)
    parser.add_argument("--db-pass", required=True)
    parser.add_argument("--backup-dir", default="/home/laisonamarante/backups")
    parser.add_argument("--output-json", default="/tmp/easy_old_config.json")
    parser.add_argument("--output-sql", default="/tmp/easy_import_config.sql")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--run-tag", default="easy_config_import")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--reuse-json", action="store_true")
    args = parser.parse_args()

    output_json_path = Path(args.output_json)
    if args.reuse_json and output_json_path.exists():
        old = json.loads(output_json_path.read_text(encoding="utf-8"))
    else:
        old = scrape_old_config(args.base_url, args.username, args.password, verbose=args.verbose)
        output_json_path.write_text(json.dumps(old, ensure_ascii=False, indent=2), encoding="utf-8")

    state = current_state(args)
    sql_text, _ids, report = build_sql(old, state)
    Path(args.output_sql).write_text(sql_text, encoding="utf-8")

    result = {
        "summary": {
            "banks": len(old["banks"]),
            "agencies": len(old["agencies"]),
            "modalities": len(old["modalities"]),
            "flows": len(old["flows"]),
            "stages": len(old["stages"]),
            "situations": len(old["situations"]),
            "documents_used": len(old["documents_used"]),
        },
        "plan": report,
        "output_json": args.output_json,
        "output_sql": args.output_sql,
        "backup": None,
    }

    if args.apply:
        backup_name = f"novo_amarante_config_backup_{args.run_tag}.sql"
        backup_path = backup_current_config(args, backup_name)
        apply_sql(args, sql_text)
        result["backup"] = backup_path

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
