#!/usr/bin/env python3
"""
追溯矩阵一致性检查。

把 traceability-matrix skill 里原本写给模型自查的两条规则（空 DES/TC 列未标注
N/A、REQ 编号复用）变成确定性脚本：退出码非 0 即代表矩阵不完整，供 /approve 调用
以阻断未完成阶段的确认（evidence over claims——矩阵完整由脚本证明，不靠模型自述）。

用法：
  python check-matrix.py [--matrix docs/traceability-matrix.md] [--phase <requirement|design|code|test>]

--phase 控制检查严格度：只有该阶段及之前应回填的列被要求非空。
  requirement: REQ编号 + 需求摘要
  design:       + DES编号（允许 N/A(复用) 这类合法非空值）
  code:         + 代码位置
  test:         + TC编号、测试结论

退出码：0=完整；1=有问题；2=矩阵文件不存在。
"""
import argparse
import re
import sys
from pathlib import Path

# 强制 UTF-8 输出：Windows 默认 GBK，中文经管道传给 Node/钩子会乱码
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass  # 老版本 Python 无 reconfigure，回退默认编码

# 列索引（与 templates/docs/traceability-matrix.md 表头一致，改动需同步）
(
    COL_REQ, COL_REQ_SUM, COL_DES, COL_DES_SUM,
    COL_CODE, COL_TC, COL_TC_RESULT, COL_STATUS,
) = range(8)
HEADER = ["REQ编号", "需求摘要", "DES编号", "设计摘要", "代码位置", "TC编号", "测试结论", "阶段状态"]

# 各阶段必须非空的列（含本阶段及之前应回填的）
PHASE_REQUIRED = {
    "requirement": [COL_REQ, COL_REQ_SUM],
    "design": [COL_REQ, COL_REQ_SUM, COL_DES],
    "code": [COL_REQ, COL_REQ_SUM, COL_DES, COL_CODE],
    "test": [COL_REQ, COL_REQ_SUM, COL_DES, COL_CODE, COL_TC, COL_TC_RESULT],
}

PLACEHOLDER_CELL = re.compile(r"^(xxx|tbd|待定|todo|-)?$", re.IGNORECASE)
REQ_PLACEHOLDER = re.compile(r"(XXX|TBD|待定)", re.IGNORECASE)
LEGAL_STATUS = {"需求已确认", "设计已确认", "编码已确认", "测试已通过", "退回"}
SEP_CELL = re.compile(r"^:?-{2,}:?$")


def is_empty(cell: str) -> bool:
    """空或占位符算未填。"""
    return PLACEHOLDER_CELL.match(cell.strip()) is not None


def parse_rows(text: str):
    """解析 markdown 表格数据行。返回 list[list[str]]，每行补齐到 8 列。"""
    rows = []
    saw_header = False
    for line in text.splitlines():
        line = line.strip()
        if not (line.startswith("|") and line.endswith("|")):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if not saw_header:
            if cells[: len(HEADER)] == HEADER:
                saw_header = True
            continue  # 表头或表前说明行，跳过
        # 分隔行 |---|---|
        if all(SEP_CELL.match(c) for c in cells if c != ""):
            continue
        while len(cells) < 8:
            cells.append("")
        rows.append(cells[:8])
    return rows


def check(rows, phase):
    errors = []
    req_seen = {}
    required = PHASE_REQUIRED[phase]
    for i, cells in enumerate(rows, start=1):
        req = cells[COL_REQ]
        if is_empty(req):
            errors.append(f"第 {i} 行：REQ编号 为空（每行必须有唯一 REQ 编号）。")
        else:
            if REQ_PLACEHOLDER.search(req):
                errors.append(f"第 {i} 行：REQ编号 `{req}` 像模板占位，请替换为真实编号。")
            if req in req_seen:
                errors.append(
                    f"第 {i} 行：REQ编号 `{req}` 与第 {req_seen[req]} 行重复（编号一旦分配不可复用）。"
                )
            else:
                req_seen[req] = i
        # 阶段必填列（REQ 已单独处理）
        for col in required:
            if col == COL_REQ:
                continue
            name = HEADER[col]
            if is_empty(cells[col]):
                hint = "（若复用已有能力，DES 编号列填 N/A(复用) 并简述原因，不留空）。" if col == COL_DES else "。"
                errors.append(
                    f"第 {i} 行（{req or '缺REQ'}）：`{name}` 列为空——{phase} 阶段已确认，该列应已回填{hint}"
                )
        # 阶段状态列合法性（若非空）
        status = cells[COL_STATUS]
        if status and status not in LEGAL_STATUS:
            errors.append(
                f"第 {i} 行（{req}）：阶段状态 `{status}` 非法，应为 {sorted(LEGAL_STATUS)} 之一。"
            )
    return errors


def main():
    ap = argparse.ArgumentParser(description="追溯矩阵一致性检查")
    ap.add_argument("--matrix", default="docs/traceability-matrix.md", help="矩阵文件路径")
    ap.add_argument(
        "--phase", default="test", choices=list(PHASE_REQUIRED.keys()),
        help="检查到哪个阶段（默认 test 最严）",
    )
    args = ap.parse_args()

    path = Path(args.matrix)
    if not path.exists():
        print(f"[check-matrix] 矩阵文件不存在：{path}", file=sys.stderr)
        sys.exit(2)

    rows = parse_rows(path.read_text(encoding="utf-8"))
    if not rows:
        print(f"[check-matrix] 未在 {path} 解析到数据行（矩阵为空或格式不对）。", file=sys.stderr)
        sys.exit(1)

    errors = check(rows, args.phase)
    if errors:
        print(
            f"[check-matrix] 矩阵不完整（--phase {args.phase}），共 {len(errors)} 处问题：",
            file=sys.stderr,
        )
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[check-matrix] 矩阵完整（--phase {args.phase}，{len(rows)} 行全部通过）。")
    sys.exit(0)


if __name__ == "__main__":
    main()
