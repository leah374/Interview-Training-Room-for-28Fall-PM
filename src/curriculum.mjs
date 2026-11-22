// Curated starter questions; these are original exercises, not claimed real interviews.
import {readFileSync} from 'node:fs';
let resumeCards=[];
let resumeDataMode='demo';
const sources=process.env.COACH_DEMO_DATA==='1'
  ? [['../data/demo/resume_cards.json','demo']]
  : [['../data/private/resume_cards.json','private'],['../data/demo/resume_cards.json','demo']];
for(const [path,mode] of sources){try{resumeCards=JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));resumeDataMode=mode;break;}catch{}}
export {resumeCards,resumeDataMode};
export const competencies = [
  ['auction','专业能力','广告竞价与计费','区分优化目标、排序依据和计费事件'],
  ['diagnosis','专业能力','投放效果诊断','定位指标异常，并设计验证路径'],
  ['measurement','专业能力','归因与数据回传','理解数据质量与归因口径的影响'],
  ['experiment','专业能力','实验与增量评估','通过对照实验衡量真实业务收益'],
  ['rag','专业能力','RAG 与知识检索','设计有来源、可评估的检索系统'],
  ['agent','专业能力','广告 AI 产品','设计可控、可验证的广告智能助手'],
  ['problem','产品能力','问题与需求定义','从用户目标出发识别真实问题'],
  ['metrics','产品能力','指标与方案取舍','建立目标指标、护栏和实验标准'],
  ['delivery','产品能力','推进与协作','推动跨团队决策并管理风险'],
  ['reflection','产品能力','项目复盘','讲清个人贡献、结果和改进'],
  ['english','面试能力','英文水平（书面表达）','评估独立英文回答的语法、术语、自然度与清晰度'],
  ['structure','面试能力','表达结构','先回应问题，再有序展开论据'],
  ['completeness','面试能力','回答完整性','覆盖关键问题、证据与边界'],
  ['concision','面试能力','表达简洁性','围绕问题表达，避免冗余']
].map(([id,group,name,description])=>({id,group,name,description}));

const criterion=(label,keywords)=>({label,keywords});
const question=(id,competency,type,title,prompt,criteria,followup,example,difficulty=2)=>({id,family:id,competency,type,title,prompt,criteria,followup,example,difficulty,minutes:6,origin:'产品内置练习'});
const starterQuestions = [
  question('q-auction','auction','知识点','oCPM 到底优化了什么？','请解释 oCPM 的优化目标、出价与计费方式。它和 CPM、CPC 有哪些不同？',[
    criterion('区分优化目标与计费',['转化','目标']),criterion('说明展示计费',['展示','曝光']),criterion('区分出价与排序',['出价','排序','竞价']),criterion('说明平台与机制边界',['平台','不同','机制'])
  ],'如果广告主按目标 CPA 出价，为什么实际 CPA 仍会波动？','oCPM 以转化为优化目标，广告主表达目标转化成本，通常按展示计费。CPM 按展示出价与计费，CPC 按点击计费。排序还会结合预估转化概率与质量，不能把出价直接当成结算成本。不同平台机制不同；我会先确认平台口径，再分析流量竞争和预估偏差。'),
  question('q-cpa','diagnosis','情景题','CPA 突然上涨 30%','一个广告计划消耗基本不变，昨天 CPA 上涨了 30%。你会如何定位原因、安排排查顺序？',[
    criterion('先检查统计口径和数据',['口径','回传','延迟','归因']),criterion('拆解漏斗',['CTR','CVR','点击率','转化率']),criterion('拆分流量与人群',['流量','人群','渠道']),criterion('验证假设与行动',['验证','实验','对照','监控'])
  ],'如果 CVR 下降，但点击质量没有变化，你如何区分转化延迟和落地页问题？','我会先确认日期、归因窗口与转化回传是否异常，避免把延迟误判为效果下降。再把 CPA 拆成点击成本与 CVR，结合 CTR 看漏斗变化，并按渠道、人群和素材拆分。若流量结构改变则做同口径对照；若落地页转化下降则检查链路并实验验证。最后明确监控窗口与回滚条件。',3),
  question('q-cold','diagnosis','情景题','新广告计划如何冷启动？','一个新广告主数据很少、预算有限，希望快速获得稳定转化。你会如何设计冷启动策略？',[
    criterion('明确目标与约束',['目标','预算']),criterion('利用已有信息并探索',['特征','历史','探索','先验']),criterion('衡量转化数据质量',['转化','回传']),criterion('设置试验与止损',['实验','验证','止损','阈值'])
  ],'如果前三天没有转化，你会立即暂停吗？你还需要哪些信息？','先确认转化目标、预算和可接受的探索成本，再检查回传链路。可以利用相似行业先验和素材信息缩小探索范围，同时保留一定探索流量。用点击到转化的漏斗和累计样本判断是否调整，设置止损阈值；不能仅凭短期零转化就否定策略。',3),
  question('q-attribution','measurement','知识点','归因转化等于增量吗？','平台显示 100 次归因转化，是否意味着广告额外带来了 100 次转化？请解释并给出验证方式。',[
    criterion('区分归因和增量',['归因','增量']),criterion('说明反事实',['自然','本来','反事实']),criterion('设计对照',['对照','随机','实验']),criterion('交代干扰和统计边界',['干扰','样本','置信','周期'])
  ],'如果不能按用户随机分组，你还会考虑什么实验设计？','不一定。归因是按规则分配转化功劳，其中一些用户即使没有看到广告也会自然转化。要测增量，需要比较实验组与对照组，尽量随机分配曝光机会，并关注跨组干扰、样本量和实验周期。无法用户随机时可以考虑地域实验，但需要验证可比性。'),
  question('q-tracking','measurement','情景题','转化回传出现重复','广告主发现平台转化数高于订单数，你如何设计回传质量排查和修复方案？',[
    criterion('统一统计定义',['口径','订单','窗口']),criterion('检查去重',['去重','订单ID','幂等']),criterion('检查重试和事件链路',['重试','埋点','事件']),criterion('修复与监控',['监控','修复','校验'])
  ],'修复后如何避免历史异常数据继续影响自动出价？','先统一有效订单、退款和归因窗口口径，再用订单 ID 串联埋点、回传和入库记录，检查客户端与服务端是否重复上报、重试是否幂等。修复去重后校验历史数据，建立异常比例监控，并评估受污染数据对出价训练的影响。'),
  question('q-ab','experiment','情景题','如何证明策略真的有效？','新排序策略使 CTR 提升 8%，你会据此全量上线吗？请设计实验决策标准。',[
    criterion('明确业务目标',['收入','转化','目标']),criterion('关注护栏',['体验','留存','成本','护栏']),criterion('检查实验可靠性',['样本','显著','随机','置信']),criterion('渐进上线与监控',['灰度','监控','回滚'])
  ],'如果 CTR 上升、广告收入上升，但广告主 ROI 下降，你怎么决策？','我不会只看 CTR。先确认主目标是收入还是转化效率，同时检查广告主 ROI、用户体验和留存护栏。确认随机分组、样本量与置信区间，排除结构变化。如果主目标改善且护栏可接受，再灰度上线并设置回滚条件。',3),
  question('q-rag','rag','知识点','RAG 的完整链路','请向业务同学解释 RAG 如何让广告诊断助手回答得更可靠，并说明它的局限。',[
    criterion('解释检索与生成',['检索','生成']),criterion('解释资料处理',['分块','向量','索引']),criterion('解释引用与验证',['来源','引用','验证']),criterion('说明失败边界',['过期','错误','幻觉','召回'])
  ],'如果知识库有正确答案，助手仍答错，你会从哪些环节排查？','RAG 先把业务资料分块并建索引，问题到来后检索相关片段，再让模型基于资料生成回答并给出来源。它能提供当前业务依据，但召回遗漏、资料过期和模型误读仍会导致错误。我会分别评估检索命中与生成忠实度，而不是只看回答流畅度。'),
  question('q-rag-eval','rag','情景题','知识库里有答案却答错','广告客服 RAG 助手答错了一个知识库中已有答案的问题，你会怎样排查和改进？',[
    criterion('复现并检查原文',['复现','原文','版本']),criterion('检查召回',['召回','检索','分块']),criterion('检查排序和上下文',['排序','上下文','重排']),criterion('建立评测集',['评测','测试集','回归'])
  ],'怎样证明加一个 reranker 值得它带来的延迟和成本？','先复现并记录模型、提示词和资料版本，再看正确片段是否被召回。没召回检查分块、关键词和向量；召回后没使用则检查重排、上下文截断和指令。建立覆盖同类问题的评测集，对比正确率、延迟和成本后再上线。',3),
  question('q-agent','agent','情景题','做一个自动调预算 Agent','你要为中小广告主设计一个自动调整预算的 Agent。哪些动作可以自动执行，如何控制风险？',[
    criterion('明确目标与预算约束',['目标','预算','ROI']),criterion('限制行动与权限',['权限','上限','确认','审批']),criterion('定义效果验证',['实验','验证','效果']),criterion('失败恢复与审计',['回滚','审计','日志','异常'])
  ],'如果模型建议翻倍预算，你会如何判断能否执行？','先明确广告主目标和总预算，给调整动作设置幅度与频次上限。低风险建议可自动生成，大额调整需用户确认；执行前检查数据新鲜度和投放约束。用对照实验评估增量收益，记录决策依据与执行日志，并提供暂停和回滚。',3),
  question('q-creative','agent','情景题','AI 素材生成怎么评估？','上线一个广告文案生成工具，你如何判断它是否为广告主创造价值？',[
    criterion('理解用户工作流',['用户','素材','工作流']),criterion('衡量生产效率',['效率','耗时','采纳']),criterion('验证线上业务结果',['转化','实验','ROI']),criterion('质量与品牌约束',['品牌','合规','事实','审核'])
  ],'如果生成效率提升但转化率下降，你会如何调整产品？','先明确用户素材制作和审核流程，用耗时、采纳率衡量生产效率。离线检查事实准确性、品牌一致性和合规，通过线上实验比较转化、成本与素材疲劳。不能只凭生成数量衡量价值，要让广告主能编辑、审核和回收效果反馈。'),
  question('q-problem','problem','情景题','客户说想要更智能的报表','广告主说“报表太复杂，希望更智能”。你如何把这句话变成可验证的产品需求？',[
    criterion('追问用户任务',['用户','任务','访谈']),criterion('定位具体阻碍',['问题','原因','场景']),criterion('比较方案与优先级',['方案','优先','成本']),criterion('验证结果',['验证','指标','实验'])
  ],'怎样区分用户需要自动解释数据，还是需要减少报表字段？','我会先访谈用户，观察他们用报表完成什么任务、在哪个步骤受阻，再区分信息找不到、指标不理解和无法行动。按影响范围与成本比较字段精简、解释和诊断建议等方案，以完成任务耗时与诊断准确率验证。'),
  question('q-priority','metrics','情景题','三个需求如何排优先级？','你同时收到“扩大定向能力”“优化转化回传”“增加 AI 素材”三个需求，资源只够做一个，你怎么排序？',[
    criterion('明确业务阶段与目标',['目标','阶段','用户']),criterion('评估影响与成本',['影响','收益','成本']),criterion('考虑依赖与风险',['依赖','风险','基础']),criterion('验证关键假设',['验证','假设','数据'])
  ],'如果销售强烈要求 AI 素材，但回传质量很差，你怎么沟通？','先对齐业务阶段和目标，判断核心瓶颈。比较需求覆盖用户、预期收益、开发成本和验证难度，同时检查依赖：回传质量差可能影响所有优化能力。用数据说明优先级，并为不确定需求安排小范围验证。'),
  question('q-metrics','metrics','知识点','为广告 AI 助手设计指标','一个广告诊断助手要从试用走向正式发布，你会设计哪些核心指标和护栏？',[
    criterion('业务结果',['业务','收益','ROI','转化']),criterion('任务质量',['准确','采纳','完成']),criterion('使用效率',['耗时','效率','延迟']),criterion('护栏与成本',['成本','错误','权限','护栏'])
  ],'建议采纳率很高，但实际效果一般，可能说明什么？','我会从任务完成率与诊断准确性评估质量，从采纳后增量收益或转化效果评估业务价值，同时记录操作耗时、模型延迟和单位成本。护栏包括错误建议率、越权动作和用户投诉；采纳率只说明用户愿意尝试，不能替代真实效果。'),
  question('q-conflict','delivery','行为面','业务和算法意见不一致','请讲一次业务方和技术或算法团队意见不一致的经历。你做了什么，结果如何？没有对应经历时可以明确说明。',[
    criterion('具体背景与分歧',['背景','分歧','目标']),criterion('本人采取行动',['我','沟通','行动']),criterion('决策依据与取舍',['数据','依据','取舍','实验']),criterion('结果和复盘',['结果','复盘','改进'])
  ],'这件事里哪些行动是你独立完成的？如果重来你会改变什么？','这是行为题，请使用真实经历：先说明项目背景和双方分歧，再明确我如何用数据或小实验建立共同依据，解释取舍和自己的行动，最后交代结果与复盘。没有做过的行动不要补写成经历。'),
  question('q-failure','reflection','行为面','讲一次没有达到预期的项目','请讲一个没有达到预期的项目，说明你如何判断失败、承担责任并调整。',[
    criterion('目标与实际差距',['目标','预期','实际']),criterion('定位原因',['原因','假设','数据']),criterion('本人调整',['我','调整','行动']),criterion('经验与后续验证',['复盘','验证','改进'])
  ],'你后来在哪个项目中验证过这次复盘的结论？','请围绕真实经历说明目标与实际结果差距，用证据分析假设哪里失效，讲清自己的责任与调整动作。最后说明复盘如何影响之后的决策，并区分已验证经验和仍待验证的想法。'),
  question('q-resume','reflection','简历面','深挖一个代表项目','选择简历中最能代表你能力的一个项目，介绍背景、你的职责、关键决策及结果。',[
    criterion('背景与目标',['背景','目标']),criterion('个人贡献',['我','负责','职责']),criterion('方案与决策依据',['方案','数据','决策']),criterion('结果与指标口径',['结果','指标','口径'])
  ],'项目的结果中，哪些可以归因于你的工作？有哪些其他因素？','以你的实际项目为准：背景和目标是什么，我具体负责什么，为什么选择该方案，有什么数据与实验支持，最后结果如何、统计口径是什么。明确团队成绩与个人贡献，并说明归因限制。'),
  question('q-resume-decision','problem','简历面','复盘一次关键产品决策','回顾你实习中一次关键产品决策。当时有哪些备选方案，你为什么选择最后的方案？',[
    criterion('明确目标约束',['目标','约束']),criterion('列出备选方案',['方案','备选','选择']),criterion('解释取舍依据',['数据','取舍','成本']),criterion('结果和反思',['结果','反思','验证'])
  ],'如果当时的资源减少一半，你的选择会变化吗？','请使用你真实参与的决策，说明目标和约束、比较过的方案、数据与成本等取舍依据，再讲结果和反思。若只是参与讨论，要如实区分自己的判断与最终决策权。')
];
const resumeCompetency=id=>({
  'shopee-morning':'agent','shopee-creative':'agent','ks-bid':'auction','ks-attribution':'diagnosis','ks-adjustment-agent':'agent',
  'jd-growth':'problem','jd-anomaly':'diagnosis','kwai-iaa':'experiment','kwai-player':'metrics','meituan-experience':'problem',
  'bid-agent-research':'agent','video-agent':'rag','tencent-recommend':'problem','yelp-rec':'rag'
})[id]||'reflection';
const resumeQuestions=resumeCards.flatMap(card=>card.questions.map((probe,index)=>({
  id:`resume-${card.id}-${index+1}`,family:`resume-${card.id}`,resumeCardId:card.id,
  competency:resumeCompetency(card.id),type:'简历面',title:`${card.title} · ${probe.focus}`,prompt:probe.prompt,
  criteria:[criterion('本人角色与实际行动',['我','负责','参与']),criterion('项目目标及业务约束',['目标','问题','约束']),criterion('该项目的关键细节',probe.keywords),criterion('结果口径与结论边界',['结果','指标','验证','口径','尚未'])],
  followup:probe.followup,
  example:`回答框架：先交代「${card.title}」的业务目标和自己负责的部分，再解释具体方案与取舍。可依据底稿中记录的事实展开：${card.facts.slice(0,2).join('；')}。最后说明哪些结果已验证，并核对：${card.claimToVerify}。不要把团队工作或预期收益表述为个人已实现成果。`,
  difficulty:3,minutes:7,origin:resumeDataMode==='private'?'个人简历底稿 · 自述待核实':'匿名演示经历 · 请替换为本人简历'
})));
export const questions=[...starterQuestions,...resumeQuestions];

const englishQuestions=[
 ['en-intro','用英文介绍自己','Please introduce yourself and explain why you are interested in an advertising strategy or AI product role.','Which experience best demonstrates your fit for this role?'],
 ['en-project','用英文讲项目取舍','Describe a product project you worked on. What problem did you solve, what trade-offs did you make, and what was your personal contribution?','How did you measure the outcome, and what would you do differently?'],
 ['en-ads','用英文诊断广告效果','An advertising campaign has a rising cost per action. How would you investigate it and validate your proposed changes?','How would you distinguish an attribution issue from a real drop in conversion performance?']
].map(([id,title,prompt,followup])=>({...question(id,'english','情景题',title,prompt,[criterion('回应问题',['goal','problem','role']),criterion('具体证据',['example','data','result']),criterion('判断与取舍',['because','trade-off','however']),criterion('验证与反思',['measure','test','learn'])],followup,'先明确观点，再用真实经历支撑；不要虚构数字和个人贡献。'),language:'en'}));
questions.push(...englishQuestions);
