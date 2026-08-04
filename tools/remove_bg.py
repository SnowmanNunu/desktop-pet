#!/usr/bin/env python3
"""rembg 去底辅助脚本（供 tools/prepare-sprites.mjs 调用）

直接用 rembg 库 API，绕开 rembg CLI 对 gradio 的依赖。
用法：python3 remove_bg.py <输入图片> <输出png>
"""
import sys

from rembg import remove


def main() -> None:
    if len(sys.argv) != 3:
        print('usage: remove_bg.py <input> <output>', file=sys.stderr)
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, 'rb') as f:
        result = remove(f.read())
    with open(dst, 'wb') as f:
        f.write(result)


if __name__ == '__main__':
    main()
