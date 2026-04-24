#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode


SCRIPT_DIR = Path(__file__).resolve().parent
IMPORTER_PATH = SCRIPT_DIR / "import_easy_configs.py"


def load_easy_client():
    spec = importlib.util.spec_from_file_location("easy_import", IMPORTER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Falha ao carregar {IMPORTER_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


PROFILE_VALUES = {
    "Administrador": "1",
    "Atendente": "2",
    "Construtora": "3",
    "Corretor": "4",
    "Parceiro": "5",
    "Imobiliária": "6",
    "Gerente": "7",
    "Engenheiro": "8",
}


USER_ROW_RE = re.compile(
    r'UsuarioManter\.aspx\?id=([^"&]+)&amp;tp=1.*?'
    r'PermissaoUsuario\.aspx\?id=([^"&]+)&amp;nm=([^"]+).*?'
    r"</td><td>(.*?)</td><td>(.*?)</td><td>(.*?)</td><td>(.*?)</td>",
    re.S,
)

CHILD_RE = re.compile(
    r'<input[^>]*id="MainContent_TreeView1n(\d+)CheckBox"([^>]*)>'
    r'\s*<span[^>]*id="MainContent_TreeView1t\1">\s*([^<]+)</span>',
    re.S,
)

PARENT_LABEL_RE = re.compile(
    r'<span class="MainContent_TreeView1_0 MainContent_TreeView1_1 MainContent_TreeView1_3" '
    r'id="MainContent_TreeView1t(\d+)">\s*([^<]+)</span>',
    re.S,
)


def clean_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value)
    return (
        value.replace("&#231;", "ç")
        .replace("&#225;", "á")
        .replace("&#243;", "ó")
        .replace("&amp;", "&")
        .strip()
    )


def parse_users_from_listing(page: str) -> list[dict[str, str]]:
    users: list[dict[str, str]] = []
    for match in USER_ROW_RE.finditer(page):
        edit_id, perm_id, perm_name, nome, login, situacao, perfil = match.groups()
        users.append(
            {
                "edit_id": clean_text(edit_id),
                "perm_id": clean_text(perm_id),
                "perm_name": clean_text(perm_name),
                "nome": clean_text(nome),
                "login": clean_text(login),
                "situacao": clean_text(situacao),
                "perfil": clean_text(perfil),
            }
        )
    return users


def parse_permission_tree(page: str) -> list[dict[str, object]]:
    groups: list[dict[str, object]] = []
    parent_matches = list(PARENT_LABEL_RE.finditer(page))
    for index, match in enumerate(parent_matches):
        node_id, group_name = match.groups()
        children_anchor = page.find(f'<div id="MainContent_TreeView1n{node_id}Nodes"', match.end())
        if children_anchor == -1:
            continue
        next_parent_start = parent_matches[index + 1].start() if index + 1 < len(parent_matches) else len(page)
        children_html = page[children_anchor:next_parent_start]
        actions = []
        for child_match in CHILD_RE.finditer(children_html):
            _child_id, attrs, action_name = child_match.groups()
            actions.append(
                {
                    "label": clean_text(action_name),
                    "checked": 'checked="checked"' in attrs,
                }
            )
        groups.append({"group": clean_text(group_name), "actions": actions})
    return groups


def normalize_permissions(groups: list[dict[str, object]]) -> dict[str, dict[str, bool]]:
    normalized: dict[str, dict[str, bool]] = {}
    for group in groups:
        group_name = str(group["group"])
        actions: dict[str, bool] = {}
        for action in group["actions"]:
            actions[str(action["label"])] = bool(action["checked"])
        normalized[group_name] = actions
    return normalized


def list_users_by_profile(client, profile_value: str) -> list[dict[str, str]]:
    page = client.get("Usuario.aspx")
    form = client.hidden_fields(page)
    form["ctl00$MainContent$txtNome"] = ""
    form["ctl00$MainContent$ddlPerfil"] = profile_value
    form["ctl00$MainContent$ddlSituacao"] = "ATI"
    form["ctl00$MainContent$ddlSubEst"] = ""
    form["ctl00$MainContent$btnPesquisar"] = "Pesquisar"
    # O filtro dessa tela só respeita os campos quando o POST vai para a rota /Usuario.
    result = client.post("Usuario", form)
    return parse_users_from_listing(result)


def main() -> int:
    parser = argparse.ArgumentParser(description="Mapeia permissões do sistema antigo por perfil.")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--limit-per-profile", type=int, default=10)
    args = parser.parse_args()

    importer = load_easy_client()
    client = importer.EasyClient(args.base_url, args.username, args.password, verbose=False)
    client.login()

    report: dict[str, object] = {"profiles": {}}
    for profile_name, profile_value in PROFILE_VALUES.items():
        users = list_users_by_profile(client, profile_value)
        if args.limit_per_profile > 0:
            users = users[:args.limit_per_profile]
        profile_entry: dict[str, object] = {
            "users": users,
            "samples": [],
            "patterns": {},
            "permission_stats": {},
        }

        print(f"[perfil] {profile_name}: {len(users)} usuários", file=sys.stderr, flush=True)

        pattern_counts: dict[str, int] = defaultdict(int)
        permission_counts: dict[str, dict[str, dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: {"checked": 0, "unchecked": 0}))

        for index, user in enumerate(users):
            query = urlencode({"id": user["perm_id"], "nm": user["perm_name"]})
            print(
                f"  - coletando {profile_name}: {user['login']} ({index + 1}/{len(users)})",
                file=sys.stderr,
                flush=True,
            )
            page = client.get(f"PermissaoUsuario.aspx?{query}")
            permissions = parse_permission_tree(page)
            normalized = normalize_permissions(permissions)

            signature = json.dumps(normalized, ensure_ascii=False, sort_keys=True)
            pattern_counts[signature] += 1

            for group_name, actions in normalized.items():
                for action_name, checked in actions.items():
                    bucket = permission_counts[group_name][action_name]
                    bucket["checked" if checked else "unchecked"] += 1

            if index < 5:
                profile_entry["samples"].append(
                    {
                        "login": user["login"],
                        "nome": user["nome"],
                        "permissions": permissions,
                    }
                )

        profile_entry["patterns"] = {
            signature: count for signature, count in sorted(pattern_counts.items(), key=lambda item: item[1], reverse=True)
        }
        profile_entry["permission_stats"] = permission_counts

        report["profiles"][profile_name] = profile_entry

    output_path = Path(args.output)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
