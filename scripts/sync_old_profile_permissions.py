#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterable
from pathlib import Path


PERMISSIONS_FILE = Path(__file__).resolve().parents[1] / "client" / "src" / "pages" / "Seguranca" / "Permissoes.tsx"

SYNC_PROFILES = [
    "Administrador",
    "Atendente",
    "Construtora",
    "Corretor",
    "Parceiro",
    "Imobiliária",
    "Gerente",
]


def extract_resources() -> list[str]:
    text = PERMISSIONS_FILE.read_text(encoding="utf-8")
    return re.findall(r"{ key: '([^']+)', label: '([^']+)' }", text)


def load_old_map(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def old_allowed(profile_entry: dict[str, object], group: str, action: str) -> bool:
    stats = profile_entry.get("permission_stats", {})
    group_stats = stats.get(group, {})
    counts = group_stats.get(action)
    if not counts:
        return False
    checked = int(counts.get("checked", 0))
    unchecked = int(counts.get("unchecked", 0))
    return checked > unchecked


def grant(perms: dict[str, bool], keys: Iterable[str], condition: bool) -> None:
    if not condition:
        return
    for key in keys:
        if key in perms:
            perms[key] = True


def build_profile_permissions(profile: str, old_profiles: dict[str, object], resources: list[str]) -> dict[str, bool]:
    perms = {resource: False for resource in resources}

    if profile == "Administrador":
        return {resource: True for resource in resources}

    entry = old_profiles.get(profile)
    if not entry:
        return perms

    any_cadastro = False
    any_config = False

    def allow(group: str, action: str) -> bool:
        return old_allowed(entry, group, action)

    def cadastro_block(group: str, base: str, has_delete: bool = True) -> None:
        nonlocal any_cadastro
        visualizar = allow(group, "Visualizar")
        gravar = allow(group, "Gravar")
        excluir = allow(group, "Excluir") if has_delete else False
        grant(perms, [base], visualizar)
        grant(perms, [f"{base}:criar", f"{base}:editar"], gravar)
        grant(perms, [f"{base}:excluir"], excluir)
        any_cadastro = any_cadastro or visualizar or gravar or excluir

    cadastro_block("Cadastro de Cliente", "cadastro:comprador")
    cadastro_block("Cadastro de Cliente", "cadastro:vendedor")
    cadastro_block("Cadastro de Imóvel", "cadastro:imovel", has_delete=False)
    cadastro_block("Cadastro de Construtora", "cadastro:construtora", has_delete=False)
    cadastro_block("Cadastro de Empreendimento", "cadastro:empreendimento", has_delete=False)
    cadastro_block("Cadastro de Imobiliária", "cadastro:imobiliaria", has_delete=False)
    cadastro_block("Cadastro de Corretor", "cadastro:corretor", has_delete=False)
    cadastro_block("Cadastro de Parceiro", "cadastro:parceiro", has_delete=False)
    cadastro_block("Cadastro de Agência", "cadastro:agencia", has_delete=False)

    grant(perms, ["cadastro:subestabelecido"], allow("Cadastro de Subestabelecido", "Visualizar"))
    any_cadastro = any_cadastro or allow("Cadastro de Subestabelecido", "Visualizar")

    any_config = any(
        allow(group, action)
        for group in ["Cadastro de Modalidade", "Cadastro de Situação", "Cadastro de Etapa", "Cadastro de Fluxo", "Cadastro de Banco"]
        for action in ["Visualizar", "Gravar", "Excluir"]
    )

    process_visualizar = allow("Cadastro de Processo", "Visualizar")
    process_gravar = allow("Cadastro de Processo", "Gravar")
    process_excluir = allow("Cadastro de Processo", "Excluir")

    pre_visualizar = allow("Pré Análise", "Visualizar")

    task_any = any(allow("Tarefa", action) for action in ["Criar", "Resolver", "Visualizar"])
    rel_processos = allow("Relatórios", "Processos por Etapa")
    rel_producao = allow("Relatórios", "Produção")
    rel_parceiro = allow("Relatórios", "Parceiro")
    rel_tarefas = allow("Relatórios", "Tarefas")

    fin_pagar_visualizar = allow("Contas a Pagar", "Visualizar")
    fin_pagar_gravar = allow("Contas a Pagar", "Gravar")
    fin_receber_visualizar = allow("Contas a Receber", "Visualizar")
    fin_receber_gravar = allow("Contas a Receber", "Gravar")
    fin_fluxo_visualizar = allow("Fluxo de Caixa", "Visualizar")
    fin_fluxo_gravar = allow("Fluxo de Caixa", "Gravar")

    perms["menu:home"] = True
    grant(perms, ["menu:cadastros"], any_cadastro)
    grant(perms, ["menu:configuracoes"], any_config)
    grant(perms, ["menu:processos"], process_visualizar or process_gravar)
    grant(perms, ["menu:pre_analise"], pre_visualizar)
    grant(perms, ["menu:tarefas"], task_any)
    grant(perms, ["menu:relatorios"], rel_processos or rel_producao or rel_parceiro or rel_tarefas)
    grant(perms, ["menu:advertencias"], allow("Advertência", "Visualizar"))
    grant(perms, ["menu:contas_pagar"], fin_pagar_visualizar or fin_pagar_gravar)
    grant(perms, ["menu:contas_receber"], fin_receber_visualizar or fin_receber_gravar)
    grant(perms, ["menu:fluxo_caixa"], fin_fluxo_visualizar or fin_fluxo_gravar)

    grant(perms, ["home:meus_processos"], process_visualizar or process_gravar)
    grant(perms, ["home:pre_analise"], pre_visualizar)
    grant(perms, ["home:tarefas"], task_any)

    grant(perms, ["processo:criar", "processo:editar"], process_gravar)
    grant(perms, ["processo:excluir"], process_excluir)

    # O sistema antigo não separa pré-análise em ações finas; no novo, liberar criar/editar
    # aproxima melhor o comportamento antigo sem conceder exclusão automática.
    grant(perms, ["pre_analise:criar", "pre_analise:editar"], pre_visualizar)

    grant(perms, ["financeiro:pagar:criar", "financeiro:pagar:editar"], fin_pagar_gravar)
    grant(perms, ["financeiro:receber:criar", "financeiro:receber:editar"], fin_receber_gravar)
    grant(perms, ["financeiro:fluxo:criar"], fin_fluxo_gravar)

    grant(perms, ["relatorio:processos"], rel_processos)
    grant(perms, ["relatorio:producao"], rel_producao)
    grant(perms, ["relatorio:parceiro"], rel_parceiro)
    grant(perms, ["relatorio:tarefas"], rel_tarefas)

    return perms


def sql_str(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza permissões de perfis do sistema antigo para o novo.")
    parser.add_argument("--old-map", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    resources = [key for key, _label in extract_resources()]
    old_map = load_old_map(args.old_map)
    old_profiles = old_map["profiles"]

    sql_lines = [
        "START TRANSACTION;",
    ]

    summary: dict[str, int] = {}
    for profile in SYNC_PROFILES:
        perms = build_profile_permissions(profile, old_profiles, resources)
        summary[profile] = sum(1 for allowed in perms.values() if allowed)
        sql_lines.append(f"DELETE FROM permissoes_perfil WHERE perfil = {sql_str(profile)};")
        for resource in resources:
            sql_lines.append(
                "INSERT INTO permissoes_perfil (perfil, recurso, permitido) VALUES "
                f"({sql_str(profile)}, {sql_str(resource)}, {1 if perms[resource] else 0});"
            )

    sql_lines.append("COMMIT;")

    args.output.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")
    print(json.dumps({"profiles": summary}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
