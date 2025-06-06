export const ADMIN_UIDS = ['ovHa4qtlVmSkX77PLYHLLpVujHl1', 'rP7f6ffEELgIzctnryq43JqXFNW2'];

export const isAdmin = (uid?: string | null): boolean => {
  return !!uid && ADMIN_UIDS.includes(uid);
};
