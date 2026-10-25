import os
import re
from PIL import Image

def merge_images(folder_path="glyph_F1", grid_size=16, output_size=256):
    """
    将拆分的格子图片合并成一张完整图片
    :param folder_path: 包含拆分图片的文件夹路径，默认为 glyph_F1
    :param grid_size: 格子大小，默认16x16
    :param output_size: 输出图片大小，默认256x256
    """
    # 如果文件夹路径不存在，尝试在当前目录下查找
    if not os.path.exists(folder_path):
        # 尝试在当前脚本目录下查找
        script_dir = os.path.dirname(os.path.abspath(__file__))
        folder_path = os.path.join(script_dir, folder_path)
        
        if not os.path.exists(folder_path):
            print(f"错误: 找不到文件夹 {folder_path}")
            print(f"请确保 '{folder_path}' 文件夹存在")
            return
    
    # 获取文件夹名作为输出文件名
    folder_name = os.path.basename(folder_path)
    output_path = os.path.join(os.path.dirname(folder_path), f"{folder_name}.png")
    
    print(f"处理文件夹: {folder_path}")
    print(f"输出文件: {output_path}")
    
    # 获取所有png文件
    png_files = [f for f in os.listdir(folder_path) if f.endswith('.png')]
    
    if not png_files:
        print("错误: 文件夹中没有找到PNG图片")
        return
    
    print(f"找到 {len(png_files)} 个PNG文件")
    
    # 解析文件名，获取行列信息
    def parse_filename(filename):
        # 匹配格式: XX_XX.png (十六进制)
        match = re.match(r'^([0-9A-F]{2})_([0-9A-F]{2})\.png$', filename, re.IGNORECASE)
        if match:
            row = int(match.group(1), 16)
            col = int(match.group(2), 16)
            return row, col
        return None, None
    
    # 创建网格数据结构
    num_cells = output_size // grid_size
    grid = [[None for _ in range(num_cells)] for _ in range(num_cells)]
    
    # 填充网格
    valid_files = 0
    for filename in png_files:
        row, col = parse_filename(filename)
        if row is not None and col is not None:
            if 0 <= row < num_cells and 0 <= col < num_cells:
                img_path = os.path.join(folder_path, filename)
                try:
                    img = Image.open(img_path)
                    # 确保图片尺寸正确
                    if img.size != (grid_size, grid_size):
                        img = img.resize((grid_size, grid_size))
                    
                    # 如果图片没有透明通道，添加透明通道
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                    
                    grid[row][col] = img
                    valid_files += 1
                except Exception as e:
                    print(f"警告: 无法读取 {filename}: {e}")
            else:
                print(f"警告: {filename} 的行列值超出范围")
        else:
            print(f"警告: {filename} 文件名格式不正确，跳过")
    
    print(f"成功读取 {valid_files} 个有效图片")
    
    # 检查是否所有格子都存在
    missing = []
    for row in range(num_cells):
        for col in range(num_cells):
            if grid[row][col] is None:
                missing.append(f"{row:02X}_{col:02X}")
    
    if missing:
        print(f"警告: 缺失以下 {len(missing)} 个格子，将用透明图片填充")
        if len(missing) <= 20:
            print(f"缺失格子: {', '.join(missing)}")
        else:
            print(f"缺失格子: {', '.join(missing[:10])}... (共{len(missing)}个)")
        
        # 用透明图片填充缺失的格子
        transparent = Image.new('RGBA', (grid_size, grid_size), (0, 0, 0, 0))
        for row in range(num_cells):
            for col in range(num_cells):
                if grid[row][col] is None:
                    grid[row][col] = transparent
    
    # 创建输出图片（带透明通道）
    output_img = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
    
    # 合并图片
    for row in range(num_cells):
        for col in range(num_cells):
            if grid[row][col]:
                # 计算粘贴位置
                x = col * grid_size
                y = row * grid_size
                # 使用透明通道粘贴
                output_img.paste(grid[row][col], (x, y), grid[row][col])
    
    # 保存输出图片（保留透明通道）
    output_img.save(output_path, 'PNG')
    print(f"完成! 已生成图片: {output_path}")
    print(f"图片尺寸: {output_size}x{output_size}")
    print(f"图片格式: RGBA (支持透明)")

if __name__ == "__main__":
    print("=" * 50)
    print("图片合并工具 - 将拆分格子合并成完整图片")
    print("=" * 50)
    
    # 交互式输入
    folder_path = input("请输入格子文件夹路径 (默认: glyph_F1): ").strip()
    # 移除可能的引号
    folder_path = folder_path.strip('"').strip("'")
    
    # 如果用户直接回车，使用默认值
    if not folder_path:
        folder_path = "glyph_F1"
    
    # 可选：输入格子大小
    try:
        grid_input = input("请输入格子大小 (默认: 16): ").strip()
        grid_size = int(grid_input) if grid_input else 16
    except ValueError:
        print("输入无效，使用默认值16")
        grid_size = 16
    
    # 可选：输入输出大小
    try:
        size_input = input("请输入输出图片大小 (默认: 256): ").strip()
        output_size = int(size_input) if size_input else 256
    except ValueError:
        print("输入无效，使用默认值256")
        output_size = 256
    
    print("\n" + "-" * 50)
    print(f"开始处理...")
    print(f"文件夹: {folder_path}")
    print(f"格子大小: {grid_size}x{grid_size}")
    print(f"输出大小: {output_size}x{output_size}")
    print("-" * 50 + "\n")
    
    # 执行合并
    merge_images(folder_path, grid_size, output_size)