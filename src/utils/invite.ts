/**
 * 邀请码工具函数
 * 处理邀请码的生成、解析、存储等功能
 */

// 邀请码存储 key
const INVITE_CODE_KEY = 'hashfi_invite_code';
const INVITER_ADDRESS_KEY = 'hashfi_inviter_address';

/**
 * 根据地址生成邀请码
 * 使用 Base36 编码压缩地址长度
 */
export function generateInviteCode(address: string): string {
  if (!address || !address.startsWith('0x')) {
    throw new Error('Invalid address format');
  }
  
  // 移除 0x 前缀并转为大写
  const cleanAddress = address.slice(2).toUpperCase();
  
  // 将 16 进制地址转为 Base36 以缩短长度
  const inviteCode = BigInt('0x' + cleanAddress).toString(36).toUpperCase();
  
  return inviteCode;
}

/**
 * 解析邀请码回地址
 */
export function parseInviteCode(inviteCode: string): string {
  try {
    if (!inviteCode) {
      throw new Error('Invite code is empty');
    }
    
    // Base36 转回 16 进制
    const hexValue = BigInt(parseInt(inviteCode.toLowerCase(), 36)).toString(16);
    
    // 补齐到 40 位（以太坊地址长度）
    const paddedHex = hexValue.padStart(40, '0');
    
    // 添加 0x 前缀
    const address = '0x' + paddedHex;
    
    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid address format after parsing');
    }
    
    return address;
  } catch (error) {
    console.error('Failed to parse invite code:', error);
    throw new Error('Invalid invite code format');
  }
}

/**
 * 生成邀请链接
 */
export function generateInviteLink(address: string): string {
  const inviteCode = generateInviteCode(address);
  const baseUrl = window.location.origin;
  return `${baseUrl}/invite/${inviteCode}`;
}

/**
 * 保存邀请码到本地存储
 */
export function saveInviteCode(inviteCode: string): void {
  try {
    localStorage.setItem(INVITE_CODE_KEY, inviteCode);
    
    // 同时保存解析后的邀请人地址
    const inviterAddress = parseInviteCode(inviteCode);
    localStorage.setItem(INVITER_ADDRESS_KEY, inviterAddress);
    
    console.log('Invite code saved:', inviteCode, 'Inviter:', inviterAddress);
  } catch (error) {
    console.error('Failed to save invite code:', error);
  }
}

/**
 * 获取保存的邀请码
 */
export function getSavedInviteCode(): string | null {
  return localStorage.getItem(INVITE_CODE_KEY);
}

/**
 * 获取保存的邀请人地址
 */
export function getSavedInviterAddress(): string | null {
  return localStorage.getItem(INVITER_ADDRESS_KEY);
}

/**
 * 清除保存的邀请信息
 */
export function clearInviteData(): void {
  localStorage.removeItem(INVITE_CODE_KEY);
  localStorage.removeItem(INVITER_ADDRESS_KEY);
}

/**
 * 检查是否有待处理的邀请
 */
export function hasPendingInvite(): boolean {
  return !!getSavedInviteCode();
}

/**
 * 复制邀请链接到剪贴板
 */
export async function copyInviteLink(address: string): Promise<boolean> {
  try {
    const inviteLink = generateInviteLink(address);
    await navigator.clipboard.writeText(inviteLink);
    return true;
  } catch (error) {
    console.error('Failed to copy invite link:', error);
    
    // 降级方案：使用旧的方法
    try {
      const inviteLink = generateInviteLink(address);
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 格式化地址显示
 */
export function formatAddress(address: string): string {
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}