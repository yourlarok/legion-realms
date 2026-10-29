# 构建说明

targetFinish: whitebox
buildStage: whitebox
buildPath: custom
experienceProfile: system-led
signature_command: N/A

## 必须保真

桌面浏览器本地双人；中文界面；完整启动、出牌、行动、包围、胜负与重开。龙族飞行/范围攻击与异潮菌毯必须改变真实规则。被围功能建筑停止贡献，防御塔保留近程防御但失去额外射程。固定 seed，表现层不另算规则。

## 最小实现与复现

标准新局验证完整循环；“包围演示”提供可复现的包围前后局面。核心输入路径见 `design/GAME_DESIGN.md`。

## 运行

toolchain:
- targetPlatform: 桌面浏览器
- targetRuntime: Chrome
- testedRuntime: Chrome 154；HeadlessChrome 156（独立自动化会话）
- engine: Three.js 0.180.0 + TypeScript 5.9.3 + Vite 7.3.7
- engineVersion: 与 `npm list --depth=0` 一致
- runtimeVersion: Node.js v22.23.1
- packageManager: npm 10.9.8

commands:
- install: `npm install`
- buildOrExport: `npm run build`
- start: `npm run dev -- --host 127.0.0.1`
- modelCheck: Chrome 实际输入路径与包围演示
- verify: NOT_APPLICABLE（whitebox）

verification:
- owner: design owner
- evidence: `build/evidence/initial-board.png`、`build/evidence/surrounded-board.png`
- 2026-10-29 实际观察：标准构建通过；canvas 真实渲染，无外部资源请求和页面运行错误。通过真实鼠标完成幼龙与龙巢部署、回合切换和抽牌；龙巢正常时下回合指挥点为 7。
- 包围演示开局无被围棋子。真实点选潜猎体并封堵缺口后，箭塔与龙巢被围，箭塔射程 2→1，龙族下回合指挥点保持基础值 6。
- 浏览器规则调用验证：龙族可进入河流格；菌毯卡改变目标及相邻格；菌毯上的异潮被围时攻击 1→2、移动 2→3 恢复；防御塔回合结束实际造成 2 点伤害。
- 将敌方核心设为 2 点生命的边界局面中，通过真实技能卡点击摧毁核心，出现龙族获胜界面；“开始新局”恢复回合 1、双方核心和 6 点指挥。

## 限制

暂不包含 AI、联网、音频、正式模型、移动端与长期平衡。Vite 提示主包约 531 kB 的体积警告，不影响本次构建或运行；尚未做性能与跨浏览器验证。
