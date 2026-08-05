import os

parts = ['part1.txt', 'part2.txt', 'part3.txt', 'part4.txt', 'part5.txt', 'part6.txt']
target = 'src/games/fanorona/FanoronaMultiplayer.jsx'
total_size = 0

# Remove old file
if os.path.exists(target):
    os.remove(target)
    print("🗑  Old file removed")

# Write all parts
with open(target, 'w', encoding='utf-8') as f:
    for part in parts:
        if os.path.exists(part):
            with open(part, 'r', encoding='utf-8') as pf:
                content = pf.read()
                f.write(content)
                total_size += len(content)
                print(f"✅ {part} added ({len(content)} chars)")
        else:
            print(f"❌ {part} MISSING")

print(f"\n🎉 Done! {target} = {total_size} chars total")
