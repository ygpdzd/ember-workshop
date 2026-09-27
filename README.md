# 余烬工坊 / Ember Workshop

一个全自动法杖构筑战斗原型：玩家编辑法杖中的法术与符文，战斗中由法杖自动循环释放。

## 在线部署

网站入口位于 `prototype/index.html`。使用 Cloudflare Pages 连接本仓库时：

- 构建命令：留空
- 构建输出目录：`prototype`
- 根目录：留空

这是零构建静态项目，不需要安装依赖。

## 本地运行

在项目根目录执行：

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory prototype
```

然后访问 <http://127.0.0.1:8765>。

## 功能

- 遗迹竞技场全自动战斗
- 双法杖独立计时与联动
- 法杖中心显示下一发法术
- 背包中装入、移除、排序法术和符文
- 编辑单张法术的伤害、层数、弹速等参数
- 战斗中锁定构筑，重置后继续编辑

## 测试

```powershell
node prototype/link-engine.test.cjs
```
