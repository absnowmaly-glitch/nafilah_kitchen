export const STATUS = {
  MENUNGGU: 'menunggu_pembayaran',
  DIPROSES: 'diproses',
  SIAP: 'siap',
  SELESAI: 'selesai',
  BATAL: 'dibatalkan',
};

export const STATUS_CONFIG = {
  [STATUS.MENUNGGU]: {
    label: 'Menunggu Bayar',
    shortLabel: 'Baru',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  [STATUS.DIPROSES]: {
    label: 'Diproses',
    shortLabel: 'Diproses',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
  },
  [STATUS.SIAP]: {
    label: 'Siap Diambil',
    shortLabel: 'Siap',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  [STATUS.SELESAI]: {
    label: 'Selesai',
    shortLabel: 'Selesai',
    color: 'bg-stone-100 text-stone-600 border-stone-300',
    dot: 'bg-stone-400',
  },
  [STATUS.BATAL]: {
    label: 'Dibatalkan',
    shortLabel: 'Batal',
    color: 'bg-red-100 text-red-700 border-red-300',
    dot: 'bg-red-500',
  },
};

// Status aktif yang tampil sebagai "antrian berjalan" (badge, hitungan, dll)
export const ACTIVE_STATUSES = [STATUS.MENUNGGU, STATUS.DIPROSES, STATUS.SIAP];

// Urutan alur: status sekarang -> status berikutnya saat tombol aksi ditekan
export const NEXT_STATUS = {
  [STATUS.MENUNGGU]: STATUS.DIPROSES,
  [STATUS.DIPROSES]: STATUS.SIAP,
  [STATUS.SIAP]: STATUS.SELESAI,
};

export const NEXT_ACTION_LABEL = {
  [STATUS.MENUNGGU]: 'Tandai Sudah Bayar',
  [STATUS.DIPROSES]: 'Tandai Siap Diambil',
  [STATUS.SIAP]: 'Selesai / Sudah Diambil',
};
