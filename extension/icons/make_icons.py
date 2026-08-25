#!/usr/bin/env python3
"""Write 16/48/128 toolbar icons (no third-party deps)."""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ACCENT = (201, 100, 66, 255)
WHITE = (255, 255, 255, 255)
CREAM = (250, 247, 244, 255)
LINE = (224, 218, 209, 255)


def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, size, px):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            row.extend(px[y][x])
        rows.append(bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def cover_round_rect(x, y, x0, y0, w, h, rad):
    lx = x - x0
    ly = y - y0
    if lx < -1 or ly < -1 or lx > w + 1 or ly > h + 1:
        return 0.0
    cx = min(max(lx, rad), w - rad)
    cy = min(max(ly, rad), h - rad)
    d = math.hypot(lx - cx, ly - cy)
    if d <= rad - 0.55:
        return 1.0
    if d >= rad + 0.55:
        return 0.0
    return max(0.0, min(1.0, rad + 0.55 - d))


def mix(dst, src, a):
    if a <= 0:
        return dst
    da = dst[3] / 255.0
    out_a = a + da * (1 - a)
    if out_a <= 0:
        return (0, 0, 0, 0)
    return (
        int((src[0] * a + dst[0] * da * (1 - a)) / out_a),
        int((src[1] * a + dst[1] * da * (1 - a)) / out_a),
        int((src[2] * a + dst[2] * da * (1 - a)) / out_a),
        int(out_a * 255),
    )


def draw(size):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]

    def put(x, y, color, a=1.0):
        if a <= 0 or x < 0 or y < 0 or x >= size or y >= size:
            return
        px[y][x] = mix(px[y][x], color, a)

    rad = size * 0.22
    for y in range(size):
        for x in range(size):
            a = cover_round_rect(x + 0.5, y + 0.5, 0, 0, size, size, rad)
            if a:
                put(x, y, ACCENT, a)

    m = size * 0.18
    dw = size - 2 * m
    dh = size * 0.62
    dx0 = m
    dy0 = size * 0.2
    rr = max(1.6, size * 0.07)
    for y in range(size):
        for x in range(size):
            a = cover_round_rect(x + 0.5, y + 0.5, dx0, dy0, dw, dh, rr)
            if a:
                put(x, y, CREAM, a)

    fold = size * 0.15
    x1 = dx0 + dw
    y1 = dy0
    for y in range(int(y1), int(y1 + fold) + 2):
        for x in range(int(x1 - fold) - 1, int(x1) + 1):
            if (x1 - (x + 0.5)) + ((y + 0.5) - y1) <= fold:
                put(x, y, LINE, 0.95)

    inset = dx0 + size * 0.1
    right = dx0 + dw - size * 0.1
    n_lines = 3 if size >= 32 else 2
    for i in range(n_lines):
        yy = int(dy0 + dh * (0.36 + i * 0.17))
        w = (right - inset) * (1 if i < n_lines - 1 else 0.62)
        thickness = 2 if size >= 48 else 1
        for t in range(thickness):
            for x in range(int(inset), int(inset + w)):
                put(x, yy + t, ACCENT, 0.92)

    return px


def main():
    for s in (16, 48, 128):
        path = os.path.join(HERE, f"icon{s}.png")
        write_png(path, s, draw(s))
        print("wrote", path)


if __name__ == "__main__":
    main()
