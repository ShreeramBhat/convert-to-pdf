#!/usr/bin/env python3
"""Verify that reconstructed code blocks match the live page byte-for-byte.

Page text extracted with get_page_text loses leading indentation and collapsed
inner alignment spaces. This script compares each fenced block in the transcript
against a fingerprint taken from the DOM (leading-space count + trimmed length
per line), which is cheap to pull and catches every whitespace error.

Collect the fingerprint with two javascript_tool calls on the page:

  [...document.querySelectorAll('main pre')].map((e,i)=>i+': '+
    e.textContent.split('\\n').map(l=>l.match(/^ */)[0].length).join(',')).join('\\n')

  [...document.querySelectorAll('main pre')].map((e,i)=>i+': '+
    e.textContent.split('\\n').map(l=>l.trim().length).join(',')).join('\\n')

Save each result to a file, then:

  python3 check_code_blocks.py transcript.md --indents ind.txt --lengths len.txt
"""
import argparse, re, sys


def parse_fp(path):
    out = {}
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        m = re.match(r'^(\d+)\s*:\s*(.*)$', line)
        if not m:
            continue
        vals = [int(x) for x in m.group(2).split(',') if x.strip() != '']
        out[int(m.group(1))] = vals
    return out


def fenced(md_path):
    blocks, buf, inside = [], [], False
    for line in open(md_path, encoding='utf-8').read().split('\n'):
        if line.strip().startswith('```'):
            if inside:
                blocks.append('\n'.join(buf))
                buf, inside = [], False
            else:
                inside = True
            continue
        if inside:
            buf.append(line)
    return blocks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('markdown')
    ap.add_argument('--indents', required=True)
    ap.add_argument('--lengths', required=True)
    args = ap.parse_args()

    ind, ln = parse_fp(args.indents), parse_fp(args.lengths)
    blocks = fenced(args.markdown)
    bad = 0

    if len(blocks) != len(ind):
        print(f'! block count: transcript has {len(blocks)}, page has {len(ind)}')
        bad += 1

    for i, code in enumerate(blocks):
        ei, el = ind.get(i), ln.get(i)
        if ei is None or el is None:
            print(f'! block {i}: no fingerprint')
            bad += 1
            continue
        lines = code.split('\n')
        while lines and lines[-1] == '':
            lines.pop()
        if len(lines) != len(ei):
            print(f'! block {i}: {len(lines)} lines, page has {len(ei)}')
            bad += 1
        for j, l in enumerate(lines):
            if j >= len(ei):
                break
            got = (len(l) - len(l.lstrip(' ')), len(l.strip()))
            exp = (ei[j], el[j])
            if got != exp:
                print(f'! block {i} line {j+1}: indent/len {got} != page {exp}\n    {l!r}')
                bad += 1
        if not bad:
            pass

    print('ALL BLOCKS MATCH' if bad == 0 else f'{bad} problem(s) — fix before building')
    sys.exit(0 if bad == 0 else 1)


if __name__ == '__main__':
    main()
