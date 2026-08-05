// 商店数据。stock: { item, cost, qty:null(无限)|N(有限) }
// 追加新商店 = 末尾加一条记录。

export const SHOPS = [
  { id: 'SHOP_SMITH', name: '阿伟的铁匠铺', sellRate: 0.5, stock: [
    { item: 'HERB', cost: 8 },
    { item: 'POTION_S', cost: 20 },
    { item: 'WPN_IRON', cost: 70 },
    { item: 'ARM_LEATHER', cost: 80 },
    { item: 'WPN_STEEL', cost: 220, qty: 1 },
    { item: 'ARM_CHAIN', cost: 260, qty: 1 },
  ] },
  { id: 'SHOP_CAMP', name: '军中行商·老万', sellRate: 0.5, stock: [
    { item: 'POTION_S', cost: 20 },
    { item: 'POTION_M', cost: 50 },
    { item: 'ETHER_S', cost: 40 },
    { item: 'ACC_RING_GOLD', cost: 180, qty: 1 },
    { item: 'ARM_PLATE', cost: 800, qty: 1 },
    { item: 'WPN_MYTHRIL', cost: 650, qty: 1 },
  ] },
  { id: 'SHOP_ELF', name: '圣树商会', sellRate: 0.5, stock: [
    { item: 'POTION_M', cost: 50 },
    { item: 'POTION_L', cost: 120 },
    { item: 'ETHER_M', cost: 100 },
    { item: 'ACC_RING_MAGIC', cost: 200, qty: 1 },
    { item: 'ACC_MANTLE', cost: 900, qty: 1 },
    { item: 'WPN_DRAGON', cost: 1400, qty: 1 },
  ] },
];
