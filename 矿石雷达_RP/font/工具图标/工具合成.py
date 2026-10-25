import os
from PIL import Image

# --- 配置 ---
FOLDERS = ["swords", "pickaxes", "axes", "shovels", "hoes"]
MATERIALS_ORDER = ["wood", "stone", "iron", "gold", "diamond", "netherite"]
OUTPUT_IMAGE_NAME = "glyph_F2.png"

CANVAS_SIZE = 256
ITEM_SIZE = 16
ITEMS_PER_ROW = 5 # 每行只放5个工具

# --- 1. 创建完全透明的画布 (背景是空的) ---
# RGBA 模式的 (0, 0, 0, 0) 表示完全透明
final_image = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

# 定义一个透明的小块，用于填充多余的空格
transparent_pixel = Image.new("RGBA", (1, 1), (0, 0, 0, 0))

# --- 2. 按行遍历工具 ---
current_row = 0
for folder in FOLDERS:
    # 找当前类别的文件
    row_files = []
    for material in MATERIALS_ORDER:
        # 构造文件名
        file_map = {
            "axes": f"{material}_axe.png",
            "pickaxes": f"{material}_pickaxe.png",
            "shovels": f"{material}_shovel.png",
            "hoes": f"{material}_hoe.png",
            "swords": f"{material}_sword.png"
        }
        file_path = os.path.join(folder, file_map.get(folder, ""))
        
        if os.path.exists(file_path):
            row_files.append(file_path)

    # 当前行的 Y 坐标
    y = current_row * ITEM_SIZE
    
    # 填充当前行的 32 个格子 (512/16 = 32)
    for col in range(32): 
        x = col * ITEM_SIZE
        
        if col < ITEMS_PER_ROW and col < len(row_files):
            # 读取原图（原图自身带有透明通道）
            tool_img = Image.open(row_files[col]).convert("RGBA")
            
            # 确保大小是 16x16
            if tool_img.size != (ITEM_SIZE, ITEM_SIZE):
                tool_img = tool_img.resize((ITEM_SIZE, ITEM_SIZE), Image.Resampling.NEAREST)
            
            # 【关键】：使用 mask 进行粘贴
            # 这样原图透明的部分不会盖住任何东西，画布原本的透明背景会透出来
            final_image.paste(tool_img, (x, y), mask=tool_img)
        else:
            # 超出 5 个的部分或者不够工具的地方，填充全透明图块
            transparent_block = transparent_pixel.resize((ITEM_SIZE, ITEM_SIZE), Image.Resampling.NEAREST)
            final_image.paste(transparent_block, (x, y))

    current_row += 1

# --- 3. 填补剩下的所有空白行 ---
for row in range(current_row, 32):
    y = row * ITEM_SIZE
    for col in range(32):
        x = col * ITEM_SIZE
        transparent_block = transparent_pixel.resize((ITEM_SIZE, ITEM_SIZE), Image.Resampling.NEAREST)
        final_image.paste(transparent_block, (x, y))

# --- 4. 保存为 PNG (保留透明通道) ---
final_image.save(OUTPUT_IMAGE_NAME)
print(f"✅ 纯透明底图生成成功！输出文件: {OUTPUT_IMAGE_NAME}")