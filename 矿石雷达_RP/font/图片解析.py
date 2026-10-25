import os
from PIL import Image

def is_transparent_cell(cell, threshold=0):
    """
    检查格子是否完全透明
    :param cell: PIL图片对象
    :param threshold: 透明度阈值，小于此值视为完全透明
    :return: True表示完全透明，False表示有内容
    """
    # 如果图片没有透明通道，直接返回False（有内容）
    if cell.mode != 'RGBA':
        return False
    
    # 获取透明度通道数据
    alpha = cell.getchannel('A')
    # 获取所有像素的透明度值
    alpha_data = alpha.getdata()
    
    # 检查是否所有像素的透明度都为0（完全透明）
    # 或者检查是否所有像素的透明度都低于阈值
    for a in alpha_data:
        if a > threshold:
            return False
    return True

def split_image(image_path, grid_size=16, skip_transparent=True, threshold=0):
    """
    将图片拆分成指定大小的格子，可选择跳过完全透明的格子
    :param image_path: 图片路径
    :param grid_size: 格子大小，默认16x16
    :param skip_transparent: 是否跳过完全透明的格子，默认True
    :param threshold: 透明度阈值，默认0（只有完全透明才跳过）
    """
    # 打开图片
    img = Image.open(image_path)
    
    # 确保图片是256x256
    if img.size != (256, 256):
        print(f"警告: 图片尺寸为{img.size}，不是256x256，将进行缩放")
        img = img.resize((256, 256))
    
    # 确保图片有透明通道
    if img.mode != 'RGBA':
        print("图片没有透明通道，将转换为RGBA模式")
        img = img.convert('RGBA')
    
    # 获取文件名（不含扩展名）作为输出文件夹名
    file_name = os.path.splitext(os.path.basename(image_path))[0]
    output_dir = os.path.join(os.path.dirname(image_path), file_name)
    
    # 创建输出文件夹
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 计算格子数量
    num_cells = 256 // grid_size  # 16
    
    # 统计信息
    total_cells = num_cells * num_cells
    saved_cells = 0
    skipped_cells = 0
    
    # 拆分图片
    for row in range(num_cells):
        for col in range(num_cells):
            # 计算裁剪区域
            left = col * grid_size
            top = row * grid_size
            right = left + grid_size
            bottom = top + grid_size
            
            # 裁剪格子
            cell = img.crop((left, top, right, bottom))
            
            # 检查是否完全透明（如果启用跳过功能）
            if skip_transparent and is_transparent_cell(cell, threshold):
                skipped_cells += 1
                print(f"跳过透明格子: [{row:02X}][{col:02X}]")
                continue
            
            # 生成十六进制文件名 (行, 列)
            hex_name = f"{row:02X}_{col:02X}.png"
            output_path = os.path.join(output_dir, hex_name)
            
            # 保存格子
            cell.save(output_path)
            saved_cells += 1
            print(f"已保存: {hex_name}")
    
    print(f"\n完成!")
    print(f"总格子数: {total_cells}")
    print(f"已保存: {saved_cells} 个格子")
    if skip_transparent:
        print(f"跳过透明格子: {skipped_cells} 个")
    print(f"输出目录: {output_dir}")

def split_image_with_custom_size(image_path, grid_size=16, skip_transparent=True, threshold=0):
    """
    支持自定义输出尺寸的拆分版本
    """
    img = Image.open(image_path)
    
    # 获取图片尺寸
    width, height = img.size
    
    # 确保图片是正方形
    if width != height:
        print(f"警告: 图片不是正方形 ({width}x{height})，将裁剪为正方形")
        min_size = min(width, height)
        img = img.crop((0, 0, min_size, min_size))
        width = height = min_size
    
    # 确保图片有透明通道
    if img.mode != 'RGBA':
        print("图片没有透明通道，将转换为RGBA模式")
        img = img.convert('RGBA')
    
    # 获取文件名（不含扩展名）作为输出文件夹名
    file_name = os.path.splitext(os.path.basename(image_path))[0]
    output_dir = os.path.join(os.path.dirname(image_path), file_name)
    
    # 创建输出文件夹
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 计算格子数量
    num_cells = width // grid_size
    
    # 统计信息
    total_cells = num_cells * num_cells
    saved_cells = 0
    skipped_cells = 0
    
    # 拆分图片
    for row in range(num_cells):
        for col in range(num_cells):
            # 计算裁剪区域
            left = col * grid_size
            top = row * grid_size
            right = left + grid_size
            bottom = top + grid_size
            
            # 裁剪格子
            cell = img.crop((left, top, right, bottom))
            
            # 检查是否完全透明（如果启用跳过功能）
            if skip_transparent and is_transparent_cell(cell, threshold):
                skipped_cells += 1
                print(f"跳过透明格子: [{row:02X}][{col:02X}]")
                continue
            
            # 生成十六进制文件名 (行, 列)
            hex_name = f"{row:02X}_{col:02X}.png"
            output_path = os.path.join(output_dir, hex_name)
            
            # 保存格子
            cell.save(output_path)
            saved_cells += 1
            print(f"已保存: {hex_name}")
    
    print(f"\n完成!")
    print(f"总格子数: {total_cells}")
    print(f"已保存: {saved_cells} 个格子")
    if skip_transparent:
        print(f"跳过透明格子: {skipped_cells} 个")
    print(f"输出目录: {output_dir}")

if __name__ == "__main__":
    # 使用示例
    print("=" * 50)
    print("图片拆分工具 - 跳过完全透明的格子")
    print("=" * 50)
    
    image_path = input("请输入图片路径: ").strip()
    # 移除可能的引号
    image_path = image_path.strip('"').strip("'")
    
    if not os.path.exists(image_path):
        print("文件不存在，请检查路径")
        exit()
    
    # 获取用户配置
    try:
        grid_size = input("请输入格子大小 (默认16): ").strip()
        grid_size = int(grid_size) if grid_size else 16
    except ValueError:
        print("输入无效，使用默认值16")
        grid_size = 16
    
    skip_option = input("是否跳过完全透明的格子? (y/n, 默认y): ").strip().lower()
    skip_transparent = skip_option != 'n'
    
    if skip_transparent:
        try:
            threshold_input = input("透明度阈值 (0-255, 默认0表示完全透明才跳过): ").strip()
            threshold = int(threshold_input) if threshold_input else 0
        except ValueError:
            print("输入无效，使用默认值0")
            threshold = 0
    else:
        threshold = 0
    
    print(f"\n开始处理...")
    print(f"格子大小: {grid_size}x{grid_size}")
    print(f"跳过透明: {skip_transparent}")
    if skip_transparent:
        print(f"透明度阈值: {threshold}")
    print("-" * 50)
    
    # 使用基础版本（256x256）
    split_image(image_path, grid_size, skip_transparent, threshold)
    
    # 如果要支持任意尺寸，使用下面的版本：
    # split_image_with_custom_size(image_path, grid_size, skip_transparent, threshold)