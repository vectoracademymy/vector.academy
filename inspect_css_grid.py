import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('CSS/sample.css', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

def show_section(name):
    print(f"\n=== Styles for {name} ===")
    for i, line in enumerate(lines):
        if name in line and ('{' in line or ',' in line):
            start = max(0, i - 1)
            # Find closing brace
            end = i
            brace_count = 0
            started = False
            for j in range(i, len(lines)):
                if '{' in lines[j]:
                    brace_count += lines[j].count('{')
                    started = True
                if '}' in lines[j]:
                    brace_count -= lines[j].count('}')
                if started and brace_count == 0:
                    end = j + 1
                    break
            for k in range(start, min(len(lines), end + 2)):
                print(f"  {k+1}: {lines[k]}")

show_section(".news-")
show_section("grid")
show_section("dashboard")
