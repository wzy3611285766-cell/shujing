# 存档键登记表（4.1.1）

> 本地存储一共这 20 把钥匙。**加新键时对着这张表改四处**：
> `collectLocal()`（72_cloud_save.js，云同步打包）、`exportCode()`（34_engine_core.js，存档码）、
> `resetSave()`（34_engine_core.js，清档）、云同步前缀 `SYNC_PREFIX`（72_cloud_save.js）。
> 表里"进云 = 键名以 genji_/himath_ 开头即同步"（SYNC_PREFIX 前缀规则），shujing_ 开头不同步。

## 玩法进度（四世界 + 跨世界资产）

| 键 | 内容 | 定义处 | 进云 | 进存档码 | 清档 |
|---|---|---|---|---|---|
| `genji_v1`（SAVE_KEY） | 闯关进度（state 主本） | 11_world.js | ✓ | ✓ (a) | 单世界 |
| `genji_epic_v1`（SAVE_KEY_EPIC） | 史诗进度 | 11_world.js | ✓ | ✓ (e) | 单世界 |
| `genji_blaze_v1`（SAVE_KEY_BLAZE） | 烽火进度 | 51_blaze_data.js | ✓ | ✓ (b) | 单世界 |
| `genji_drill_v1`（SAVE_KEY_DRILL） | 练枪进度 | 53_drill4.js | ✓ | ✓ (d) | 单世界 |
| `genji_aid_v1`（SAVE_KEY_AID） | 支援券（跨世界资产） | 11_world.js | ✓ | ✓ (x) | 仅全部清 |

四个世界键各存一份**同一份**错题本（wbShare 引用别名），读档时按题干去重合并——
改错题合并策略只动 44_wrongbook_core.js 的 wbShare / wbFind 一族。

## 偏好 / 元数据（小键值）

| 键 | 内容 | 定义处 | 进云 | 说明 |
|---|---|---|---|---|
| `genji_playtime`（PLAY_KEY） | 累计游玩毫秒 | 34_engine_core.js | ✓ | 只算页面可见时间 |
| `genji_lings_v1` | 思路灵（跨三模式脑内进度） | 34_engine_core.js | ✓ | 仅"三个模式一起清"时清除 |
| `fitDensity`（FIT_K） | 题面字号档 0/1/2 | 38_session.js | ✗ | 内存缓存为真相源，localStorage 只锦上添花 |
| `genji_perflite`（LITE_KEY） | 省电档开关 | 36_loop.js | ✗ | |
| `genji_fps`（FPS_KEY） | FPS 角标开关 | 74_dbg.js | ✗ | |
| `genji_news`（NEWS_KEY） | 公告已读位（NEWS_VER） | 55_boot_news.js | ✗ | 构建期生成值，内容变必重弹 |
| `genji_upbar_skip`（UPBAR_KEY） | 通知栏"这次不提醒"的版本号 | 73_version.js | ✗ | **sessionStorage**，非 localStorage |
| `himath_lastmode` | 清档后回原世界的一次性标记 | 34/55 | ✗ | 用完即删 |
| `himath_bzclean` | 烽火清档标记 | 52_blaze_entry.js | ✗ | |
| `<世界键>_intro` ×4 | 各世界首访说明已读位 | 34/55 | ✓（随世界键前缀） | resetSave 会连带删 |

## 云同步自己的键（shujing_ 前缀，不进云、不进存档码）

| 键 | 内容 | 定义处 |
|---|---|---|
| `shujing_local_at`（SYNC_AT） | 本机存档最后写入时刻 | 72_cloud_save.js |
| `shujing_prev_local`（SYNC_BK） | 被云端覆盖前的本机备份（撤销用） | 72_cloud_save.js |
| `shujing_sync_off`（SYNC_OFF） | 玩家手动关掉自动同步 | 72_cloud_save.js |

另有 IndexedDB：`genji_shots_v1`（错题配图，40_wrongbook_photo.js），不进 localStorage、
不进云、不进存档码（图体积大），删错题时顺手清。
