export interface PaperDeepContent {
  modelId: string;
  researchBackground: string;
  algorithmIntroduction: string;
  formulaExplanations: { formula: string; explanation: string }[];
  stepDetails: { step: string; detail: string }[];
  limitations: string[];
  improvements: string[];
  conclusion: string;
}

export const PAPER_CONTENT_BATCH1: Record<string, PaperDeepContent> = {
  // ============================================================
  // 1. LightGBM 多因子选股策略
  // ============================================================
  'lightgbm-wang2023': {
    modelId: 'lightgbm-wang2023',
    researchBackground:
      '随着A股市场机构化程度提升，传统基本面选股方法难以应对海量多维因子数据。Gradient Boosting Decision Tree (GBDT) 类模型因其处理高维稀疏特征的能力成为量化选股的主流方法。然而传统GBDT训练效率低下，难以满足月度调仓的实时性要求。Wang (2023) 针对此问题，研究了LightGBM在CSI300截面选股中的应用，利用GOSS采样和EFB特征捆绑大幅提升训练效率，同时保持与XGBoost相当的预测精度。该研究填补了高效梯度提升模型在A股多因子选股场景中的实证空白。',
    algorithmIntroduction:
      'LightGBM属于集成学习中的Boosting族，是微软开源的高效GBDT实现。其核心思想是通过逐轮迭代，每轮拟合前一轮残差构建弱学习器并加权累加。相比传统GBDT，LightGBM引入两大创新: (1) GOSS (Gradient-based One-Side Sampling) 优先保留梯度绝对值大的样本，对小梯度样本随机采样，在不显著损失精度的前提下减少计算量; (2) EFB (Exclusive Feature Bundling) 将互斥特征捆绑为单一特征，降低特征维度。此外LightGBM采用Leaf-wise生长策略替代Level-wise，优先分裂增益最大的叶子节点，收敛更快但需控制max_depth防止过拟合。在选股应用中，模型以动量、波动率、技术指标等15+因子作为输入，预测未来20日截面收益率，每月选取预测收益最高的股票等权持有。',
    formulaExplanations: [
      {
        formula: '\\mathcal{L}(\\phi) = \\sum_{i=1}^{n} l(y_i, \\hat{y}_i) + \\sum_{k=1}^{K} \\Omega(f_k)',
        explanation:
          '目标函数由两部分组成: 第一项为训练损失函数l(如MSE)，衡量预测值与真实收益的偏差; 第二项为正则化项\\Omega，对所有K棵树的复杂度施加惩罚(包含叶子数T和叶权重L2范数)，防止模型过度拟合历史数据中的噪声模式。'
      },
      {
        formula: '\\hat{y}_i^{(t)} = \\hat{y}_i^{(t-1)} + \\eta \\cdot f_t(x_i)',
        explanation:
          '逐轮迭代更新公式: 第t轮的预测值等于前t-1轮的累积预测加上学习率\\eta乘以当前新树的预测。\\eta(本策略设为0.15)控制每棵树的贡献权重，较小的学习率需要更多轮次但泛化性更好。在选股中，每轮新树专注于修正前一轮预测偏差最大的股票。'
      },
      {
        formula: 'f_t(x_i) \\approx -\\frac{\\partial l(y_i, \\hat{y}_i^{(t-1)})}{\\partial \\hat{y}_i^{(t-1)}}',
        explanation:
          '核心公式: 每棵新树拟合的目标是损失函数对当前预测的负梯度(即残差方向)。对于MSE损失，负梯度恰好等于残差y_i - \\hat{y}_i。这意味着每棵新树专注于纠正前一轮预测最不准确的股票收益，逐步逼近真实收益分布。'
      }
    ],
    stepDetails: [
      {
        step: '因子构建与面板数据整理',
        detail:
          '对CSI300成分股池中每只股票构建多维因子: 动量因子(mom_5/10/20)、波动率因子(vol_10/20)、RSI_14、MACD直方图、布林带%B和宽度、换手率及其均线、量价相关性、价格偏离均线比率、ATR等。所有因子按截面做winsorize和z-score标准化，构建「日期x股票x因子」三维面板。'
      },
      {
        step: '滚动窗口训练集构建',
        detail:
          '采用12个月滚动训练窗口: 每月末取过去12个月的截面数据作为训练集，未来20日收益率(fwd_return_20d)作为标签。该窗口在捕捉最新市场状态和保证训练样本充足之间取得平衡，避免使用过长历史导致模型对已失效的因子模式过拟合。'
      },
      {
        step: 'LightGBM模型训练',
        detail:
          '使用lgb.LGBMRegressor，关键超参数: num_leaves=31, max_depth=6, learning_rate=0.05, n_estimators=200, subsample=0.8, colsample_bytree=0.8。GOSS采样自动生效(lightgbm默认boosting_type=gbdt时)。对每个月度截面独立训练模型，避免未来信息泄漏。'
      },
      {
        step: '截面排序选股',
        detail:
          '模型对当月所有股票预测未来20日收益率，按预测值从高到低排序，选取Top N只(本策略N=10)等权买入持有一个月。排序选股的核心逻辑是: 我们不需要精确预测收益率的绝对值，只需要排序正确即可获得超额收益。'
      },
      {
        step: '回测评估与因子重要性分析',
        detail:
          '使用共享回测引擎计算年化收益率(69.33%)、夏普比率、最大回撤等指标，并绘制净值曲线。通过LightGBM内置的feature_importance(gain)分析因子贡献，动量因子(mom_5, mom_10)和波动率因子(vol_10, vol_20)通常排名前列。'
      }
    ],
    limitations: [
      '仅使用20只CSI300代表性股票，远少于实际沪深300成分股，选股效果可能因股票池缩小而失真',
      '未考虑A股T+1交易制度、涨跌停限制、停牌等真实市场摩擦',
      '等权配置忽略了个股流动性差异和风险预算约束，实际组合需引入优化器',
      '回测区间仅覆盖2021-2024年，未涵盖极端行情(如2015年股灾)，策略稳健性存疑',
      '因子体系缺少基本面因子(PE/PB/ROE)和另类数据(资金流/舆情)，信息维度不够丰富',
      '未做行业中性化和市值中性化处理，策略收益可能暴露于特定行业或市值风格',
      '超参数(num_leaves=31, learning_rate=0.05)未做严格的时序交叉验证调优，存在过拟合风险'
    ],
    improvements: [
      '加入PB/PE/ROE等基本面因子和资金流、分析师预期等另类因子，丰富因子信息维度',
      '使用LightGBM的lambdarank目标函数替代回归，直接优化排序指标(NDCG)更符合选股本质',
      '引入行业中性化(行业哑变量)和市值中性化(残差化)处理消除风格偏露',
      '采用Purged K-Fold时序交叉验证替代固定训练窗口，减少数据浪费并更好评估泛化能力',
      '集成多个时间尺度(5日/10日/20日)的模型预测，构建多周期信号融合体系'
    ],
    conclusion:
      'Wang (2023)的研究验证了LightGBM在A股截面选股中的有效性，策略在2021-2024年回测中取得年化69.33%的收益率。LightGBM凭借GOSS采样和EFB特征捆绑在训练效率上大幅领先传统GBDT，动量和波动率因子被识别为最重要的预测特征。然而该策略在股票池规模、交易摩擦模拟、因子覆盖度等方面存在简化，实盘部署前需在全市场范围内进行更严格的稳健性检验。整体而言，LightGBM是多因子量化选股的高效可靠基线方法。'
  },

  // ============================================================
  // 2. XGBoost + SHAP 多因子选股策略
  // ============================================================
  'xgboost-sun2024': {
    modelId: 'xgboost-sun2024',
    researchBackground:
      '机器学习模型在量化投资中的「黑箱」特性长期受到质疑，基金经理和合规团队要求模型具备可解释性。Sun (2024) 研究了XGBoost结合SHAP可解释性分析在A股量化选股中的应用。XGBoost使用二阶泰勒展开精确逼近目标函数，在正则化控制下具有优秀的泛化能力; SHAP基于博弈论Shapley值为每个因子分配精确的贡献度，实现了从「能预测」到「知道为什么」的跨越。该研究弥合了模型性能与可解释性之间的鸿沟。',
    algorithmIntroduction:
      'XGBoost属于集成学习Boosting族，由陈天奇于2016年提出。与LightGBM不同，XGBoost使用二阶梯度信息(Hessian矩阵)进行目标函数的二阶泰勒展开，理论上在凸损失函数下有更精确的近似。其正则化项包含叶子数惩罚\\gamma和叶权重L2惩罚\\lambda，有效控制树的复杂度。SHAP (SHapley Additive exPlanations) 基于合作博弈论中的Shapley值，将模型预测分解为各特征的边际贡献。对于树模型，TreeSHAP算法可在多项式时间内精确计算SHAP值，无需采样近似。在选股策略中，SHAP不仅帮助理解全局因子重要性排序，还能解释为何选中某只特定股票。策略还新增了偏度(skew)和峰度(kurt)因子捕捉收益率尾部风险。',
    formulaExplanations: [
      {
        formula: '\\mathcal{L}^{(t)} = \\sum_{i=1}^{n} \\left[ g_i f_t(x_i) + \\frac{1}{2} h_i f_t^2(x_i) \\right] + \\Omega(f_t)',
        explanation:
          'XGBoost目标函数的二阶泰勒展开: g_i为一阶梯度(损失函数对预测值的一阶导数)，h_i为二阶梯度(Hessian，损失函数对预测值的二阶导数)。二阶信息使得XGBoost在每步迭代中能更精确地确定最优树结构。\\Omega(f_t)=\\gamma T + \\frac{1}{2}\\lambda\\sum w_j^2为正则化项。'
      },
      {
        formula: 'w_j^* = -\\frac{\\sum_{i \\in I_j} g_i}{\\sum_{i \\in I_j} h_i + \\lambda}',
        explanation:
          '给定树结构后，叶节点j的最优权重由落入该叶子的所有样本的一阶梯度之和与二阶梯度之和加正则化系数\\lambda的比值决定。\\lambda越大，叶权重越趋向于零(更保守)。在选股中，叶权重直接决定了落入该叶子的股票的预测收益率。'
      },
      {
        formula: '\\text{Gain} = \\frac{1}{2}\\left[\\frac{(\\sum_{i \\in I_L} g_i)^2}{\\sum_{i \\in I_L} h_i + \\lambda} + \\frac{(\\sum_{i \\in I_R} g_i)^2}{\\sum_{i \\in I_R} h_i + \\lambda} - \\frac{(\\sum_{i \\in I} g_i)^2}{\\sum_{i \\in I} h_i + \\lambda}\\right] - \\gamma',
        explanation:
          '分裂增益衡量节点分裂的价值: 左右子节点的目标函数值之和减去未分裂时的值，再减去新增叶子的复杂度惩罚\\gamma。Gain>0时分裂有利。\\gamma充当预剪枝阈值，\\gamma越大则树越浅，有效防止对因子噪声的过拟合。'
      },
      {
        formula: '\\phi_j = \\sum_{S \\subseteq N \\setminus \\{j\\}} \\frac{|S|!(|N|-|S|-1)!}{|N|!} \\left[f(S \\cup \\{j\\}) - f(S)\\right]',
        explanation:
          'SHAP值公式: 对因子j，遍历所有不包含j的因子子集S，计算加入j后模型预测的边际变化，按组合权重加权平均。满足效率性(所有SHAP值之和等于预测值与基线的差)、对称性和空值性三大公理。在选股中，正SHAP值表示该因子推高了预测收益，负值则拉低预测。'
      }
    ],
    stepDetails: [
      {
        step: '增强因子体系构建',
        detail:
          '在LightGBM因子基础上新增偏度(skew_20/60)和峰度(kurt_20/60)因子，捕捉收益率分布的尾部特征。偏度反映收益不对称性，负偏度股票有更大的尾部下跌风险; 峰度反映极端收益出现频率，高峰度意味着更大的黑天鹅风险。'
      },
      {
        step: '滚动训练与XGBoost调参',
        detail:
          '12个月滚动窗口训练xgb.XGBRegressor，关键超参: max_depth=6, learning_rate=0.05, n_estimators=200, reg_alpha(L1)=0.1, reg_lambda(L2)=1.0, subsample=0.8, colsample_bytree=0.8。L1+L2双正则化比单一正则更鲁棒。'
      },
      {
        step: 'SHAP可解释性分析',
        detail:
          '训练完成后对测试集计算TreeSHAP值，生成summary plot展示因子全局贡献排序和方向性。高SHAP值的因子(如mom_5正向贡献)直接驱动选股决策，低SHAP值因子可考虑剔除以简化模型。'
      },
      {
        step: '截面排序与回测',
        detail:
          '按XGBoost预测收益率截面排序，选Top 10等权月度调仓。策略在回测期取得20.10%累计收益率。与LightGBM对比，XGBoost在小样本上可能更稳定(二阶信息的正则化效应)，但训练速度稍慢。'
      },
      {
        step: 'SHAP因子交互分析',
        detail:
          '利用shap.dependence_plot分析因子间的交互效应: 例如mom_5在高vol_20环境下的预测贡献可能被削弱(动量在高波动市场中失效)。这为因子组合的非线性建模提供了直观的经济学解释。'
      }
    ],
    limitations: [
      '代表性股票子集(20只)无法反映全市场截面选股效果，SHAP分析的因子重要性排序可能随股票池变化',
      '未考虑停牌、涨跌停板等A股特有交易限制，实际执行偏差(implementation shortfall)可能显著',
      '等权配置未做风险预算约束，高波动率股票在组合中的风险贡献可能不成比例',
      'SHAP值的稳定性未做跨周期检验，因子重要性在牛市和熊市可能发生结构性变化',
      'XGBoost的训练时间复杂度O(n*K*d*log n)在大规模因子矩阵上可能成为瓶颈',
      '偏度和峰度因子的经济学含义在A股散户主导的市场中可能与成熟市场不同'
    ],
    improvements: [
      '使用SHAP interaction values分析因子两两交互效应，发现非线性因子组合机会',
      '基于SHAP值的绝对均值排序进行因子筛选，去除贡献小于阈值的因子简化模型',
      '引入基本面因子(PB/PE/ROE)和行业哑变量，增强横截面区分度',
      '尝试XGBoost的rank:pairwise目标函数，直接优化股票排序而非收益率回归',
      '使用Bayesian Optimization替代GridSearch进行超参数搜索，提升调参效率'
    ],
    conclusion:
      'Sun (2024)的研究展示了XGBoost+SHAP在量化选股中的「性能+可解释性」双重价值。XGBoost通过二阶梯度和双正则化在截面收益预测中取得稳健表现，SHAP值为每个预测提供了因子级别的归因解释。偏度和峰度因子的引入丰富了尾部风险捕捉能力。策略取得20.10%累计收益，虽不及LightGBM激进，但可解释性优势使其更适合机构投资者的合规要求。SHAP分析揭示动量和波动率因子主导预测，为后续因子精选提供了数据驱动的依据。'
  },

  // ============================================================
  // 3. Random Forest 动态因子选股策略
  // ============================================================
  'random-forest-fu2020': {
    modelId: 'random-forest-fu2020',
    researchBackground:
      '传统多因子模型依赖线性回归框架，难以捕捉因子与收益之间的非线性关系。Fu (2020) 提出基于随机森林的动态因子调整选股策略，将收益预测转化为分类问题(上涨/下跌)，通过Bagging集成多棵决策树降低过拟合风险。该研究发表于MDPI可持续发展期刊，强调策略的可持续性: 随机森林的OOB误差估计无需额外验证集，Gini重要性可动态追踪因子有效性变化。实证在A股市场取得年化57%收益率和2.21夏普比率。',
    algorithmIntroduction:
      '随机森林属于集成学习中的Bagging(Bootstrap Aggregating)族，由Leo Breiman于2001年提出。它结合了两层随机性: (1) Bootstrap采样为每棵树生成不同的训练子集; (2) 随机特征子空间在每个节点分裂时随机选取\\sqrt{p}个候选特征。这种双重随机性使得各树之间尽可能去相关，集成后方差大幅下降而偏差仅略微增加。在选股中，模型将问题框架为二分类: Top 40%收益率的股票标记为1(上涨)，Bottom 40%标记为0(下跌)，中间20%丢弃。分类概率作为选股信号，概率最高的Top 10股票等权买入。OOB(Out-of-Bag)误差利用每棵树未参与训练的约37%样本自动评估泛化能力。',
    formulaExplanations: [
      {
        formula: '\\hat{f}_{\\text{RF}}(x) = \\frac{1}{B} \\sum_{b=1}^{B} T_b(x)',
        explanation:
          'Bagging聚合公式: B棵决策树的预测取简单平均(回归)或多数投票(分类)。B越大，集成预测的方差越低，但边际收益递减(通常B=100-500即可)。本策略测试了B=1/3/5/10/20/50/100的效果，B=50后提升不明显。'
      },
      {
        formula: '\\hat{y} = \\arg\\max_c \\sum_{b=1}^{B} \\mathbb{1}[T_b(x) = c]',
        explanation:
          '多数投票分类: 统计B棵树中预测为各类别c的票数，票数最多的类别作为最终预测。在二分类选股中，c=1(上涨)和c=0(下跌)。选股时使用概率(正类投票比例)而非硬分类，概率越高代表更多树一致看好该股票。'
      },
      {
        formula: '\\text{OOB Error} = \\frac{1}{n} \\sum_{i=1}^{n} \\mathbb{1}\\left[y_i \\neq \\hat{f}_{\\text{OOB}}(x_i)\\right]',
        explanation:
          'OOB误差: 每个样本i仅使用未包含i的树来预测，计算预测错误率。这提供了无需划分验证集的泛化误差估计，节省宝贵的历史数据。OOB误差与K-Fold交叉验证结果高度一致。在选股中，OOB误差可实时监控模型退化。'
      },
      {
        formula: '\\text{Importance}(X_j) = \\frac{1}{B}\\sum_{b=1}^{B} \\sum_{t \\in T_b} \\Delta \\text{Gini}(t, X_j)',
        explanation:
          'Gini重要性: 对因子X_j，统计所有树中使用X_j作为分裂变量时Gini不纯度的累计下降量。该指标反映因子在全局决策边界构建中的贡献。动量因子和波动率因子通常排名前列，换手率因子也展现较高重要性。'
      }
    ],
    stepDetails: [
      {
        step: '二分类标签构建',
        detail:
          '每月截面中，按未来20日收益率排序，Top 40%标记为1(上涨)，Bottom 40%标记为0(下跌)，中间20%模糊样本丢弃。这种分位数分类避免了对收益率绝对值的预测，只需排序正确即可获利。阈值40%/60%可根据交易成本容忍度调整。'
      },
      {
        step: '随机森林模型训练',
        detail:
          '使用sklearn.ensemble.RandomForestClassifier，关键参数: n_estimators=100, max_depth=5, max_features=sqrt(n), min_samples_leaf=10。12个月滚动窗口训练。max_features=sqrt限制每个节点候选特征数，max_depth=5防止单棵树过拟合。'
      },
      {
        step: 'OOB误差监控',
        detail:
          '每个训练周期记录OOB准确率(通常在55%-65%之间)。当OOB准确率持续下降至50%附近(随机水平)时，说明当前因子体系对市场的预测力下降，可能需要更新因子或调整模型结构。'
      },
      {
        step: '概率排序选股',
        detail:
          '对当月截面所有股票预测上涨概率P(class=1)，按概率从高到低排序选取Top 10。概率排序比硬分类更精细: 概率0.85的股票比概率0.55的股票有更高置信度。等权买入持有一个月后调仓。'
      },
      {
        step: 'Gini重要性动态追踪',
        detail:
          '每月记录Gini重要性排序变化。因子重要性的时变特征反映市场风格切换: 牛市中动量因子重要性上升，震荡市中波动率因子更关键。这为动态因子权重调整提供数据支撑。'
      }
    ],
    limitations: [
      '二分类框架丢弃了中间20%的模糊样本，损失了部分有价值的信息; 阈值选择(40%/60%)具有主观性',
      'Gini重要性存在偏差: 倾向于高基数(连续变量)特征，对类别型因子可能低估。Permutation Importance是更公正的替代',
      'Bagging本质是降方差，对高偏差问题(因子与收益之间确实是线性关系时)可能不如Boosting',
      '使用20只代表性股票大幅简化了CSI300全样本选股，分类边界可能因股票池变化而迁移',
      '未考虑停牌、涨跌停等交易限制',
      '等权配置未考虑风险预算或组合优化',
      '回测区间较短(2021-2024)，未涵盖完整的牛熊周期'
    ],
    improvements: [
      '动态调整分类阈值: 根据市场波动率自适应设置上涨/下跌的分位数边界(如高波动市场放宽至30%/70%)',
      '使用Permutation Importance替代Gini Importance，消除连续特征的偏差',
      '引入Extra-Trees(极端随机树)进一步增加每个分裂点的随机性，与RF做集成对比',
      '结合RF的概率输出与GBDT模型做模型融合(Stacking)，利用Bagging+Boosting互补优势'
    ],
    conclusion:
      'Fu (2020)的研究证明随机森林在A股动态因子选股中表现优异，年化收益率57%，夏普比率2.21。将选股框架为分类问题避免了收益率绝对值预测的困难，OOB误差提供了免费的泛化评估。Bagging集成的天然低方差特性使得RF比单模型GBDT更鲁棒，尤其在市场噪声较大的时期。然而RF在偏差控制上不如Boosting方法，且Gini重要性存在已知偏差。综合来看，RF是一个稳健、简洁、适合作为集成学习基准的选股模型。'
  },

  // ============================================================
  // 4. SVM 多因子量化选股策略
  // ============================================================
  'svm-liu2023': {
    modelId: 'svm-liu2023',
    researchBackground:
      '支持向量机(SVM)以其严格的统计学习理论基础和结构化风险最小化原则在模式识别领域广受认可。Liu (2023) 研究了RBF核SVM在A股多因子选股中的应用。SVM通过核技巧将低维线性不可分的因子空间映射到高维特征空间，在该空间中寻找最大间隔超平面实现分类。该研究系统探讨了惩罚参数C和核宽度gamma的调优策略，使用GridSearchCV自动搜索最优组合。策略在回测期取得累计收益率41.25%。',
    algorithmIntroduction:
      'SVM属于判别式模型中的核方法族，由Vladimir Vapnik于1995年提出。其核心思想是在特征空间中找到一个超平面，使得两类样本的间隔(margin)最大化。对于线性不可分的情况，引入松弛变量\\xi允许一定的误分类，惩罚参数C控制误分类代价与间隔大小之间的权衡。通过对偶变换，原始问题转化为只依赖于样本内积的二次规划问题，进而可以使用核函数替代内积实现非线性分类。RBF核K(x,y)=exp(-gamma*||x-y||^2)是最常用的核函数，gamma控制核宽度: gamma大则决策边界复杂(容易过拟合)，gamma小则边界平滑(可能欠拟合)。在选股应用中，SVM对因子标准化极为敏感，必须做StandardScaler预处理。',
    formulaExplanations: [
      {
        formula: '\\min_{w, b} \\frac{1}{2}\\|w\\|^2 + C\\sum_{i=1}^{n} \\xi_i',
        explanation:
          'SVM原始优化问题: 最小化||w||^2等价于最大化分类间隔(2/||w||)，C\\sum\\xi_i是对误分类样本的惩罚总和。C越大越不容忍误分类(决策边界更复杂)，C越小越倾向于大间隔(更平滑)。在选股中，C控制模型对训练期异常样本(如暴涨暴跌股)的敏感度。'
      },
      {
        formula: '\\text{s.t.}\\quad y_i(w^T x_i + b) \\geq 1 - \\xi_i, \\quad \\xi_i \\geq 0',
        explanation:
          '约束条件: 每个样本的分类正确度至少为1-\\xi_i。当\\xi_i=0时样本在间隔外(正确分类); 0<\\xi_i<1时在间隔内但正确侧; \\xi_i>1时被误分类。松弛变量使SVM能处理线性不完全可分的因子数据。'
      },
      {
        formula: '\\max_{\\alpha} \\sum_{i=1}^{n} \\alpha_i - \\frac{1}{2}\\sum_{i,j} \\alpha_i \\alpha_j y_i y_j K(x_i, x_j)',
        explanation:
          '对偶问题: 通过Lagrange乘子\\alpha将原始问题转化为仅依赖核函数K(x_i,x_j)的二次规划。\\alpha_i>0的样本称为支持向量，它们完全决定了决策边界。支持向量的稀疏性意味着大部分训练样本对模型没有影响，体现了SVM的鲁棒性。'
      },
      {
        formula: '\\text{s.t.}\\quad 0 \\leq \\alpha_i \\leq C, \\quad \\sum_{i=1}^{n}\\alpha_i y_i = 0',
        explanation:
          '对偶约束: \\alpha_i的上界C限制了单个支持向量的影响力，\\sum\\alpha_i y_i=0保证了模型的平移不变性。在选股中，C同时控制支持向量的数量: C大则支持向量多(边界复杂)，C小则支持向量少(边界简单)。'
      }
    ],
    stepDetails: [
      {
        step: '因子标准化预处理',
        detail:
          'SVM对特征尺度极其敏感，因此必须使用StandardScaler将所有因子标准化到均值0、方差1。未标准化时，大尺度因子(如价格)会主导距离计算，小尺度因子(如RSI比率)几乎被忽略。每个训练窗口独立fit-transform。'
      },
      {
        step: '二分类标签构建',
        detail:
          '按截面收益率中位数分类: 收益率高于中位数标记为1(上涨)，低于中位数标记为0(下跌)。相比随机森林的Top/Bottom 40%划分，中位数分类利用了全部样本但边界更模糊。'
      },
      {
        step: 'GridSearchCV超参数优化',
        detail:
          '使用3-Fold交叉验证搜索最优C和gamma组合。搜索范围: C=[0.1, 1, 10, 100], gamma=[0.01, 0.1, 1, 10]。每个训练周期独立搜索以适应市场变化。GridSearch的计算开销为O(|C|*|gamma|*K*n^2)。'
      },
      {
        step: '概率校准与排序',
        detail:
          'SVM原生不输出概率，需通过Platt Scaling (probability=True) 将决策函数值映射到[0,1]概率。概率校准后按P(上涨)排序选Top 10。注意Platt Scaling增加了5-fold内部交叉验证开销。'
      },
      {
        step: 'PCA降维加速',
        detail:
          '当因子数量超过20时，考虑先用PCA降维到5-10维再训练SVM。PCA降维可将SVM训练时间从O(n^2*d)降到O(n^2*d\')，在保留90%+解释方差的前提下大幅提速。'
      },
      {
        step: '支持向量分析',
        detail:
          '记录每个训练周期的支持向量数量和比例。支持向量占比过高(>50%)说明数据线性不可分程度高或C偏大，可能需要调整核函数参数。支持向量中的股票特征分析可揭示决策边界附近的「模糊地带」。'
      }
    ],
    limitations: [
      'SVM训练时间复杂度O(n^2)~O(n^3)，在大规模截面数据上(>1000只股票)计算不可行',
      '无法直接输出因子重要性，不像树模型可以直观理解哪些因子驱动了选股',
      'Platt Scaling概率校准在小样本上可能不准确，影响概率排序的可靠性',
      'C和gamma的搜索空间离散且范围有限，可能遗漏最优组合',
      '使用代表性股票简化了全样本选股场景',
      '未考虑停牌/涨跌停等交易限制',
      '等权配置未考虑风险预算'
    ],
    improvements: [
      '使用PCA或Autoencoder降维后再训练SVM，降低计算开销和噪声',
      '尝试LinearSVC+SGD处理大规模截面数据，将复杂度降到O(n*d)',
      '使用Bayesian Optimization替代GridSearch进行超参数搜索，减少搜索空间浪费',
      '结合SVM决策函数值与树模型概率做模型Stacking，互补核方法和集成学习的优势'
    ],
    conclusion:
      'Liu (2023)的研究验证了RBF核SVM在A股多因子选股中的可行性，累计收益率41.25%。SVM的最大间隔原理提供了良好的泛化保障，核技巧有效捕捉了因子间的非线性交互。然而SVM的计算复杂度和可解释性不足是实际应用的主要障碍。GridSearchCV虽能找到较优超参数，但搜索效率偏低。SVM更适合作为多模型集成中的一个组件，而非独立使用的选股主模型。其支持向量的稀疏性特征为理解决策边界提供了独特视角。'
  },

  // ============================================================
  // 5. OLS / Ridge / Lasso / Elastic Net 多因子选股
  // ============================================================
  'lasso-elastic-ridge-xu2023': {
    modelId: 'lasso-elastic-ridge-xu2023',
    researchBackground:
      '线性回归是多因子模型的基石，但普通最小二乘法(OLS)在因子共线性严重时估计不稳定。Xu (2023) 系统比较了OLS、Ridge、Lasso和Elastic Net四种线性方法在A股量化选股中的表现差异。正则化方法通过惩罚系数大小来控制模型复杂度: Ridge保留所有因子但缩小系数(适合共线性)，Lasso产生稀疏解(因子筛选)，Elastic Net兼顾两者。实证显示OLS策略年化35.96%，但正则化方法在风险调整后可能更优。',
    algorithmIntroduction:
      '四种线性回归方法均属于参数化线性模型族，区别在于正则化项的形式。OLS直接最小化残差平方和，无约束时容易过拟合(系数爆炸)。Ridge回归添加L2惩罚(\\lambda||\\beta||_2^2)，将系数向零收缩但不会精确为零，适合因子间存在多重共线性的场景。Lasso添加L1惩罚(\\lambda||\\beta||_1)，由于L1范数在原点不可微，优化过程自然产生稀疏解(部分系数精确为零)，实现自动因子筛选。Elastic Net结合L1和L2惩罚，l1_ratio控制两者权重，当因子存在分组结构(如多个动量因子高度相关)时Elastic Net表现更稳定。正则化强度\\lambda通过交叉验证在[0.001, 0.01, 0.1, 1.0, 10.0]中搜索最优值。',
    formulaExplanations: [
      {
        formula: '\\hat{\\beta}_{OLS} = \\arg\\min_{\\beta} \\| y - X\\beta \\|_2^2',
        explanation:
          'OLS闭合解为\\beta=(X^TX)^{-1}X^Ty。当因子矩阵X的列之间高度相关时，X^TX近似奇异，微小扰动导致\\beta剧烈变化(条件数过大)。在选股中，动量因子mom_5/10/20之间的高相关性正是典型的共线性场景。'
      },
      {
        formula: '\\hat{\\beta}_{Ridge} = \\arg\\min_{\\beta} \\| y - X\\beta \\|_2^2 + \\lambda \\| \\beta \\|_2^2',
        explanation:
          'Ridge闭合解为\\beta=(X^TX+\\lambda I)^{-1}X^Ty。\\lambda I的加入使矩阵恢复正定，消除了共线性问题。\\lambda越大系数越小(趋向0但不等于0)。Ridge保留所有15个因子但降低了不稳定因子的权重，适合作为风险保守型策略。'
      },
      {
        formula: '\\hat{\\beta}_{Lasso} = \\arg\\min_{\\beta} \\| y - X\\beta \\|_2^2 + \\lambda \\| \\beta \\|_1',
        explanation:
          'Lasso无闭合解，需用坐标下降法或LARS算法迭代求解。L1正则化的几何含义是可行域为菱形，在角点处某些系数恰好为0。当\\lambda足够大时，Lasso可能只保留3-5个核心因子(如mom_5, vol_10, rsi_14)，大幅提升模型可解释性。'
      },
      {
        formula: '\\hat{\\beta}_{EN} = \\arg\\min_{\\beta} \\| y - X\\beta \\|_2^2 + \\lambda_1 \\| \\beta \\|_1 + \\lambda_2 \\| \\beta \\|_2^2',
        explanation:
          'Elastic Net通过l1_ratio=\\lambda_1/(\\lambda_1+\\lambda_2)控制L1与L2的混合比例。当l1_ratio=0.5时两者权重相等。Elastic Net的优势在于: 对于一组高度相关的因子(如mom_5/10/20)，Lasso可能随机保留一个，而Elastic Net倾向于同进同出(分组选择)。'
      }
    ],
    stepDetails: [
      {
        step: '15因子截面面板构建',
        detail:
          '选取15个核心因子: 4个动量(mom_5/10/20/60)、3个波动率(vol_5/10/20)、3个价格偏离均线(price_to_ma_5/10/20)、RSI、MACD直方图、布林带%B和宽度、量价相关性。每个截面日期独立做winsorize(去极值)和z-score标准化。'
      },
      {
        step: '四种模型并行训练',
        detail:
          '6个月滚动窗口训练4种模型: OLS无超参; Ridge通过CV搜索最优alpha; Lasso用max_iter=10000确保收敛; Elastic Net设l1_ratio=0.5。StandardScaler在每个窗口独立fit以避免前视偏差。'
      },
      {
        step: '正则化路径分析',
        detail:
          '绘制Lasso和Ridge的正则化路径图: 横轴为\\lambda从大到小，纵轴为各因子系数值。Lasso路径中系数依次进入(从0变为非0)的顺序反映了因子的重要性排序; Ridge路径中所有系数平行收缩。'
      },
      {
        step: '截面排序与四模型绩效对比',
        detail:
          '四种模型分别预测下月收益率，各选Top 10等权持有。对比年化收益率、夏普比率、最大回撤、月度IC。OLS在牛市中收益最高但波动也最大; Ridge最稳定; Lasso在因子共线性弱时与OLS接近。'
      },
      {
        step: '系数稳定性分析',
        detail:
          '追踪各模型每月的系数向量变化: OLS系数月间变化剧烈(高方差)，Ridge系数最平稳，Lasso系数在0/非0之间跳跃(因子进出)。系数稳定性直接影响换手率和交易成本。'
      }
    ],
    limitations: [
      '线性模型假设因子与收益之间为线性关系，无法捕捉非线性交互(如动量因子在不同波动率环境下效果不同)',
      '正则化参数\\lambda的搜索仅在5个离散值中选择，可能遗漏最优值; 连续搜索或Bayesian Optimization可改善',
      '6个月训练窗口对于线性模型可能偏短，样本量不足时系数估计不稳定',
      '15个因子中缺少基本面和另类数据因子',
      '使用代表性股票简化了全样本选股场景',
      '未考虑停牌/涨跌停等交易限制',
      '等权配置未考虑风险预算'
    ],
    improvements: [
      '引入自适应Lasso(Adaptive Lasso)，对不同因子施加不同的惩罚强度以获得一致性估计',
      '使用Group Lasso处理分组因子(如动量组、波动率组)，实现组级别的稀疏选择',
      '结合线性模型的因子选择结果作为非线性模型(如LightGBM)的输入特征子集',
      '引入时变正则化参数: 高波动市场增大\\lambda(更保守)，低波动市场减小\\lambda(更激进)',
      '加入Newey-West协方差估计修正因子收益率的自相关和异方差性'
    ],
    conclusion:
      'Xu (2023)的研究系统比较了四种线性回归方法的选股表现，OLS年化35.96%但系数不稳定，Ridge以最低波动率和系数稳定性成为风险厌恶型投资者的首选，Lasso的因子筛选特性为模型简化提供了方向，Elastic Net在分组因子场景中展现独特优势。正则化方法的核心价值在于提升样本外泛化能力而非训练集拟合度。四种方法的绩效差异在不同市场环境下并不固定，建议实际应用中做模型池配置而非单一模型押注。'
  },

  // ============================================================
  // 6. Kernel PCA + 线性回归 多因子选股
  // ============================================================
  'kpca-regression-zhou2020': {
    modelId: 'kpca-regression-zhou2020',
    researchBackground:
      '多因子模型面临「维度灾难」: 因子数量增多导致共线性加剧、噪声放大、过拟合风险上升。主成分分析(PCA)是经典的降维方法，但仅能捕捉因子间的线性相关结构。Zhou (2020) 提出基于核主成分分析(KPCA)的量化选股策略，通过RBF核函数将因子映射到高维非线性特征空间，在该空间中提取主成分后用线性回归预测收益。实证显示KPCA策略年化收益率达41%，优于标准PCA。',
    algorithmIntroduction:
      'KPCA属于核方法与降维技术的交叉领域。标准PCA对中心化数据矩阵X做特征分解C=X^TX/n，提取方差最大的方向作为主成分。KPCA的核心思想是: 通过核函数K(x_i,x_j)=exp(-||x_i-x_j||^2/2\\sigma^2)隐式计算样本在高维特征空间中的内积，在该空间中执行PCA。这使得KPCA能捕捉因子间的非线性关系，例如「动量因子在低波动环境中有效但在高波动环境中失效」这类条件性关系。降维后的核主成分作为新特征输入线性回归预测收益，核主成分数设为5(可覆盖约80%的方差)。策略同时对比了RBF核、多项式核(degree=3)和标准PCA三种方法。',
    formulaExplanations: [
      {
        formula: 'C = \\frac{1}{n} X^T X, \\quad C v_k = \\lambda_k v_k',
        explanation:
          '标准PCA: 对协方差矩阵C做特征分解，特征向量v_k定义了第k个主成分方向，特征值\\lambda_k表示该方向的方差大小。在选股中，第一主成分通常对应市场因子(系统性风险)，后续主成分捕捉行业、风格等维度。PCA解释方差比例可量化信息保留程度。'
      },
      {
        formula: 'K(x_i, x_j) = \\exp\\left(-\\frac{\\| x_i - x_j \\|^2}{2\\sigma^2}\\right) = \\langle \\phi(x_i), \\phi(x_j) \\rangle',
        explanation:
          'RBF核函数: 将任意两个因子向量的欧氏距离映射为[0,1]之间的相似度。\\sigma(gamma=1/2\\sigma^2)控制核宽度: \\sigma大则相似度下降慢(主成分更全局)，\\sigma小则只关注近邻样本(主成分更局部)。右侧等式说明核函数等价于在无穷维特征空间\\phi中的内积。'
      },
      {
        formula: 'z_k = \\sum_{i=1}^n \\alpha_k^{(i)} K(x_i, x)',
        explanation:
          '新样本x在第k个核主成分上的投影: 由所有训练样本的核函数加权和计算，权重\\alpha_k来自核矩阵K的特征分解。与标准PCA不同，KPCA的主成分无法表示为原始因子的线性组合，因此可解释性较差，但非线性特征提取能力更强。'
      }
    ],
    stepDetails: [
      {
        step: '15因子面板构建与标准化',
        detail:
          '构建15个因子(4动量+3波动率+3价格偏离+RSI+MACD+布林带+量价相关性)。KPCA对因子尺度敏感(核函数基于距离)，StandardScaler标准化是必要的预处理步骤。每个训练窗口独立标准化。'
      },
      {
        step: '三种降维Pipeline构建',
        detail:
          '使用sklearn.pipeline.Pipeline封装: (1) PCA+LR: StandardScaler -> PCA(n_components=5) -> LinearRegression; (2) KPCA(RBF)+LR: StandardScaler -> KernelPCA(kernel=rbf, gamma=0.1, n_components=5) -> LR; (3) KPCA(Poly)+LR: StandardScaler -> KernelPCA(kernel=poly, degree=3, n_components=5) -> LR。'
      },
      {
        step: '滚动训练与收益预测',
        detail:
          '6个月滚动窗口训练3个Pipeline，预测下月截面收益率。PCA可记录解释方差比例(通常前5成分保留70-85%方差)，KPCA无此指标但可通过重建误差间接评估。'
      },
      {
        step: '三方法绩效对比',
        detail:
          '分别选Top 10等权月度调仓，对比年化收益率、夏普比率、最大回撤。KPCA(RBF)在因子关系非线性时优势明显，PCA在因子关系近似线性时更稳定。KPCA(Poly)对degree参数敏感。'
      },
      {
        step: 'Gamma参数敏感性分析',
        detail:
          'KPCA(RBF)的gamma参数对结果影响较大: gamma=0.01时主成分过于全局化(近似线性PCA)，gamma=10时过于局部化(过拟合近邻样本)。gamma=0.1是本策略的经验值，实际应通过交叉验证搜索最优。'
      }
    ],
    limitations: [
      'KPCA的核主成分无法像PCA一样解释为原始因子的线性组合，「黑箱」降维不利于因子逻辑理解',
      '计算复杂度O(n^3)来自核矩阵的特征分解，当训练样本超过几千时计算瓶颈明显',
      'gamma参数选择对KPCA结果影响极大，但缺乏高效的自动调优方法',
      '固定n_components=5可能在不同市场环境下不是最优选择，应使用累积方差比例自适应确定',
      '使用代表性股票简化了全样本选股场景',
      '线性回归第二阶段未利用KPCA已经引入的非线性能力',
      '未考虑停牌/涨跌停等交易限制'
    ],
    improvements: [
      '使用Nystrom近似或随机Fourier特征将KPCA复杂度从O(n^3)降到O(n*m^2)，m为采样点数',
      '在KPCA降维后使用非线性模型(如LightGBM)替代线性回归，充分利用非线性特征',
      '引入稀疏KPCA(Sparse KPCA)在降维的同时实现因子选择，提升可解释性',
      '使用多核学习(MKL)自适应组合RBF核和多项式核，避免单一核函数选择偏差'
    ],
    conclusion:
      'Zhou (2020)的研究证明了KPCA在多因子量化选股中的降维价值，策略年化收益率41%。KPCA通过RBF核函数捕捉了因子间的非线性关系，在降维后的低维空间中线性回归即可获得良好的收益预测。与标准PCA对比，KPCA在因子非线性关系显著的市场环境中优势更明显。然而O(n^3)的计算复杂度和可解释性缺失是主要短板。实际应用中建议将KPCA作为特征预处理环节嵌入更复杂的模型流水线中。'
  },

  // ============================================================
  // 7. Fama-MacBeth 两步回归 多因子选股
  // ============================================================
  'fama-macbeth-cui2022': {
    modelId: 'fama-macbeth-cui2022',
    researchBackground:
      'Fama-MacBeth (1973) 两步回归是资产定价领域最经典的实证方法，被用于检验因子模型是否能解释横截面收益率差异。Cui (2022) 将该方法应用于新能源汽车产业的多因子选股策略。与机器学习方法不同，Fama-MacBeth不仅选股，更重要的是检验哪些因子在统计上具有显著的风险溢价。该研究报告了最高128.26%的收益率和2.27的夏普比率，同时提供了因子风险溢价的t检验结果。',
    algorithmIntroduction:
      'Fama-MacBeth两步回归属于资产定价实证方法族。第一步(时间序列回归): 对每只股票i，使用过去T期数据回归r_{it} = alpha_i + sum(beta_{ik}*f_{kt}) + epsilon_{it}，估计该股票对各因子的暴露(Beta)。第二步(截面回归): 每月t对所有股票做截面回归r_{it} = gamma_{0t} + sum(gamma_{kt}*beta_hat_{ik}) + eta_{it}，估计因子风险溢价gamma_k。最后对所有月份的gamma_k取均值并做t检验，检验因子是否获得显著的风险溢价。该方法的关键优势是通过时间维度取平均消除了截面回归残差的相关性问题。在选股应用中，使用估计的Beta和风险溢价预测下月收益，选择预测收益最高的股票。',
    formulaExplanations: [
      {
        formula: 'r_{i,t} = \\alpha_i + \\sum_{k=1}^K \\beta_{i,k} f_{k,t} + \\epsilon_{i,t}, \\quad t = 1, \\ldots, T',
        explanation:
          '第一步时间序列回归: 对每只股票i使用过去6个月数据估计因子暴露Beta。\\beta_{i,k}衡量股票i对因子k的敏感度，例如\\beta_{动量}=1.5意味着动量因子每上升1单位，该股票预期收益增加1.5单位。\\alpha_i为不能被因子解释的异常收益。'
      },
      {
        formula: 'r_{i,t} = \\gamma_{0,t} + \\sum_{k=1}^K \\gamma_{k,t} \\hat{\\beta}_{i,k} + \\eta_{i,t}',
        explanation:
          '第二步截面回归: 每月t对所有股票做截面回归。\\gamma_{k,t}是因子k在月份t的风险溢价，表示承担一单位因子暴露能获得多少额外收益。\\gamma_{0,t}为零Beta组合收益(类似无风险利率)。此步骤核心假设: 因子暴露越高的股票应获得越高的收益(风险定价)。'
      },
      {
        formula: '\\bar{\\gamma}_k = \\frac{1}{T_2} \\sum_{t=1}^{T_2} \\gamma_{k,t}',
        explanation:
          '因子风险溢价均值: 对T_2个月的gamma_k取时间序列平均。如果bar{gamma_k}>0且统计显著，说明因子k在截面上持续获得正向风险溢价(即高暴露股票持续跑赢低暴露股票)。这是判断一个因子是否「有效」的核心指标。'
      },
      {
        formula: 't\\text{-stat}(\\gamma_k) = \\frac{\\bar{\\gamma}_k}{\\text{SE}(\\gamma_{k,t}) / \\sqrt{T_2}}',
        explanation:
          '因子风险溢价t检验: t>2(或p<0.05)表示因子k的风险溢价在统计上显著异于零。t值越大说明因子定价能力越强且越稳定。通常|t|>3的因子被认为是强效因子。该统计推断是Fama-MacBeth方法的核心贡献，区别于纯预测性的机器学习方法。'
      }
    ],
    stepDetails: [
      {
        step: '因子面板构建与截面标准化',
        detail:
          '构建15个因子并做截面标准化。Fama-MacBeth方法要求因子在截面上有合理的分布，极端值可能主导回归结果。winsorize在1%/99%分位数截断，z-score确保不同因子具有可比性。'
      },
      {
        step: '第一步: 时间序列回归估计Beta',
        detail:
          '每月末对每只股票用过去6个月数据做OLS回归(statsmodels.OLS)，估计15个因子暴露Beta。要求每只股票在训练期内至少有20个有效观测值。Beta估计的精度受限于训练期长度(EIV问题)。'
      },
      {
        step: '第二步: 截面回归估计风险溢价',
        detail:
          '用估计的Beta作为自变量，当月实际收益率作为因变量做截面OLS。得到15个因子的月度风险溢价gamma_k和截距gamma_0。记录每月的gamma值和t统计量用于后续检验。'
      },
      {
        step: '因子风险溢价统计检验',
        detail:
          '对所有月份的gamma_k取均值和标准误，计算t统计量。|t|>2的因子被认为具有显著的风险定价能力。将检验结果与因子经济学含义对照: 动量因子应有正溢价(趋势跟随)，低波动因子可能有正溢价(低波动异象)。'
      },
      {
        step: '选股与回测',
        detail:
          '使用Beta和最新风险溢价预测下月收益: predicted_r_i = gamma_0 + sum(gamma_k * beta_{ik})。选预测收益最高的Top 10等权持有。该预测将统计检验的结论转化为可交易的选股信号。'
      }
    ],
    limitations: [
      '第一步Beta估计存在EIV(Errors-in-Variables)问题: Beta估计有误差，作为第二步的自变量会导致gamma估计有偏',
      '要求6个月时间序列长度估计Beta，对于新上市或数据缺失的股票无法覆盖',
      '纯线性框架假设因子与收益为线性关系，无法捕捉非线性和条件性关系',
      '截面回归假设Beta在预测月份不变，但短期Beta可能波动较大(Beta instability)',
      '使用代表性股票大幅简化了全样本截面分析',
      '未做Shanken (1992) EIV校正，t统计量可能被高估'
    ],
    improvements: [
      '引入Shanken (1992) 校正修正EIV导致的t统计量偏差，获得更可靠的因子溢价推断',
      '使用分组排序法(Portfolio Sort)作为稳健性检验: 按因子暴露分5-10组，检验组间收益单调性',
      '结合Newey-West调整处理截面回归残差的自相关和异方差，提升t检验的可靠性',
      '将Fama-MacBeth的因子溢价检验结果作为信号权重输入机器学习模型，融合统计推断和预测性能'
    ],
    conclusion:
      'Cui (2022)的研究将经典的Fama-MacBeth两步回归应用于A股多因子选股，获得2.27的夏普比率。该方法的核心价值不在于收益最大化，而在于提供了因子风险溢价的严格统计检验框架。相比机器学习的「黑箱」预测，Fama-MacBeth能回答「哪些因子在统计上真正有效」这一根本性问题。然而EIV偏差和线性假设限制了其预测精度。建议将其作为因子验证工具而非独立选股模型使用。'
  },

  // ============================================================
  // 8. Stacking Ensemble 多因子选股
  // ============================================================
  'stacking-ensemble-zheng2024': {
    modelId: 'stacking-ensemble-zheng2024',
    researchBackground:
      '单一模型在不同市场环境下表现不稳定: LightGBM在趋势行情中领先，Ridge在震荡市更鲁棒，XGBoost在强正则化下泛化更好。Zheng (2024) 研究了Stacking集成方法，将多个异质基学习器的预测通过元学习器融合，系统地利用了模型多样性。该研究比较了线性与非线性算法在量化投资中的表现，证明Stacking集成在收益稳定性和风险调整收益上优于任何单一模型。',
    algorithmIntroduction:
      'Stacking(堆叠泛化)属于集成学习中的元学习方法族，由David Wolpert于1992年提出。与Bagging(并行)和Boosting(串行)不同，Stacking采用分层架构: 第一层包含多个异质基学习器(如LightGBM/XGBoost/Ridge)，第二层的元学习器学习如何最优地融合基学习器的预测。关键技术是K-Fold交叉验证生成Out-of-Fold(OOF)预测作为元学习器的训练数据，避免基学习器在训练集上的预测泄漏到元学习器中。本策略以LightGBM(n_estimators=100, max_depth=5)、XGBoost(n_estimators=100, max_depth=5)和Ridge(alpha=1.0)作为基学习器，Logistic回归作为元学习器。K=5。元学习器使用简单模型防止二次过拟合。',
    formulaExplanations: [
      {
        formula: '\\hat{f}_{\\text{RF}}(x) = \\frac{1}{B} \\sum_{b=1}^{B} T_b(x)',
        explanation:
          '(参考Bagging公式) Stacking第一层每个基学习器M_j独立训练后输出预测Z_j(x)。与简单平均不同，Stacking通过元学习器学习最优加权: \\hat{y}=g(Z_1,...,Z_J)，其中g为元学习器(Logistic回归)。元学习器自动为表现好的基模型分配更高权重。'
      }
    ],
    stepDetails: [
      {
        step: '因子构建与分类标签',
        detail:
          '构建15因子面板(动量/波动率/技术指标)，截面标准化后构建二分类标签: 未来20日收益率>0标记为1，<=0标记为0。正/负样本比例约为50%/50%(较均衡，无需过采样)。'
      },
      {
        step: '第一层: 基学习器K-Fold OOF训练',
        detail:
          '对6个月训练数据做5-Fold分割。对每个Fold: 用4/5数据训练3个基学习器，对1/5做预测。拼接所有Fold的OOF预测得到与原始训练集等长的特征矩阵(n x 3)。同时在全量训练集上训练基学习器用于测试集预测。'
      },
      {
        step: '第二层: 元学习器训练',
        detail:
          '以OOF预测矩阵(n x 3)作为特征，原始标签作为目标，训练Logistic回归。Logistic回归的系数直接反映各基模型的融合权重。使用简单元学习器(非深度网络)避免二次过拟合。'
      },
      {
        step: '测试集预测与选股',
        detail:
          '3个基学习器分别预测测试集，得到(m x 3)矩阵。元学习器在此矩阵上输出最终概率。按概率排序选Top 10等权月度调仓。'
      },
      {
        step: '与单模型绩效对比',
        detail:
          '分别记录Stacking和3个单模型的回测指标。Stacking通常在年化收益率上接近最优单模型，但在最大回撤和夏普比率上显著领先(波动率更低，下行风险更小)。'
      },
      {
        step: '基模型权重分析',
        detail:
          '分析Logistic回归的系数: 如果LightGBM系数为0.45、XGBoost为0.35、Ridge为0.20，说明非线性模型在整体融合中贡献更大，但线性模型(Ridge)的互补性不可忽略(在某些截面上修正非线性模型的过拟合预测)。'
      }
    ],
    limitations: [
      '训练时间为所有基模型之和再加元学习器开销，K-Fold交叉验证进一步放大计算量(约5倍)',
      '基学习器种类有限(3个)且异质性不够: LightGBM和XGBoost同属GBDT族，可能存在预测冗余',
      '元学习器(Logistic回归)假设基模型预测之间为线性组合关系，更复杂的融合模式无法捕捉',
      '使用代表性股票简化了全样本选股场景',
      '未考虑停牌/涨跌停等交易限制',
      '等权配置未考虑风险预算',
      'OOF预测在时间序列数据上可能存在前视偏差，需使用Purged K-Fold替代随机K-Fold'
    ],
    improvements: [
      '增加更多异质基学习器: 加入SVM、Random Forest、Neural Network等不同假设的模型，提升多样性',
      '使用Purged K-Fold替代标准K-Fold，在时间序列分割时加入Purge Gap消除前视偏差',
      '元学习器升级: 使用GBM或简单MLP替代Logistic回归，捕捉基模型预测间的非线性融合关系',
      '引入动态权重: 根据最近N个月各基模型的IC表现自适应调整融合权重(在线学习)',
      '多层Stacking: 在当前两层基础上增加第三层元学习器，进一步降低偏差(需防止过拟合)'
    ],
    conclusion:
      'Zheng (2024)的研究证明Stacking集成方法在量化选股中优于单一模型。通过LightGBM+XGBoost+Ridge的异质组合和Logistic回归的自适应融合，Stacking在收益稳定性和风险调整上取得显著改善。K-Fold OOF机制有效防止了元学习器的信息泄漏。集成方法的核心价值在于利用模型多样性降低单一模型的极端风险。然而计算开销和基模型多样性不足是进一步提升的方向。实际部署中应视为首选策略框架。'
  },

  // ============================================================
  // 9. LSTM/GRU 股票预测策略
  // ============================================================
  'lstm-gru-cheng2024': {
    modelId: 'lstm-gru-cheng2024',
    researchBackground:
      '传统时间序列模型(如ARIMA)假设线性平稳性，难以捕捉股票价格中的非线性时序依赖。循环神经网络(RNN)理论上可建模任意长度的序列依赖，但原始RNN存在梯度消失/爆炸问题。Cheng (2024) 系统对比了Vanilla LSTM、Stacked 2-Layer LSTM和GRU三种变体在股票价格方向预测中的表现。使用30天滑动窗口的收盘价变化率、成交量变化率、RSI、MACD、布林带等6维特征预测贵州茅台(600519)次日涨跌方向。',
    algorithmIntroduction:
      'LSTM(Long Short-Term Memory)和GRU(Gated Recurrent Unit)均属于门控循环神经网络族。LSTM由Hochreiter和Schmidhuber于1997年提出，通过遗忘门(f_t)、输入门(i_t)、输出门(o_t)三个门控机制和细胞状态(C_t)的设计解决了梯度消失问题。遗忘门决定丢弃哪些旧信息，输入门决定写入哪些新信息，输出门决定暴露哪些信息作为隐藏状态。GRU是LSTM的简化版，将遗忘门和输入门合并为更新门，参数量减少约25%。Stacked LSTM堆叠两层LSTM，第一层输出作为第二层输入，增强特征提取层次。在本策略中，三种模型使用相同的30天窗口x6维特征输入，hidden_size=64，batch_size=32，训练50个epoch，Binary Cross-Entropy损失。',
    formulaExplanations: [
      {
        formula: 'f_t = \\sigma(W_f \\cdot [h_{t-1}, x_t] + b_f)',
        explanation:
          '遗忘门: 将上一时步隐藏状态h_{t-1}和当前输入x_t拼接后经线性变换+Sigmoid激活，输出[0,1]向量。f_t接近0的维度将被遗忘(如过期的技术指标信号)，接近1的维度将被保留(如持续的趋势信息)。在股票预测中，遗忘门学习何时忘记旧的涨跌模式。'
      },
      {
        formula: 'i_t = \\sigma(W_i \\cdot [h_{t-1}, x_t] + b_i)',
        explanation:
          '输入门: 控制当前新信息写入细胞状态的比例。i_t接近1时，当前交易日的特征(如RSI突破超买区)将被充分记录; 接近0时则忽略该信息。输入门与候选值~C_t配合，实现选择性信息写入。'
      },
      {
        formula: '\\tilde{C}_t = \\tanh(W_C \\cdot [h_{t-1}, x_t] + b_C)',
        explanation:
          '候选细胞状态: 使用tanh激活(输出[-1,1])生成当前时步的候选新信息。tanh的正负对称性允许细胞状态同时编码看多和看空的信号。候选值与输入门逐元素相乘后加入细胞状态。'
      },
      {
        formula: 'C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t',
        explanation:
          '细胞状态更新: 遗忘门控制保留多少旧信息(f_t * C_{t-1})，输入门控制写入多少新信息(i_t * ~C_t)。细胞状态是LSTM的核心长期记忆单元，信息可以在此通道上几乎无损地传递数十个时步(对应数十个交易日)。'
      }
    ],
    stepDetails: [
      {
        step: '特征工程与序列构建',
        detail:
          '计算6维特征: 收盘价日变化率、成交量日变化率、RSI(14日)、MACD直方图、布林带%B、20日波动率。StandardScaler标准化后构建30天滑动窗口序列，形状为(样本数, 30, 6)。目标为次日涨跌方向(二分类)。'
      },
      {
        step: '训练集/测试集时序划分',
        detail:
          '2021-2023年数据为训练集，2024年为测试集。严格时序划分避免前视偏差(不使用随机划分)。训练集约700个样本(去除窗口消耗的前30天)，测试集约200个样本。'
      },
      {
        step: '三种RNN变体模型构建',
        detail:
          '(1) Vanilla LSTM: nn.LSTM(input_size=6, hidden_size=64, num_layers=1) + FC(64,1) + Sigmoid; (2) Stacked LSTM: nn.LSTM(6, 64, num_layers=2, dropout=0.2); (3) GRU: nn.GRU(6, 64, 1) + FC + Sigmoid。三者使用相同的训练配置: Adam优化器(lr=1e-3), BCE损失, 50 epochs, batch=32。'
      },
      {
        step: '训练与早停策略',
        detail:
          '每个epoch在训练集上前向传播+反向传播更新参数。监控训练损失和验证集(训练集最后20%)准确率。当验证准确率连续10个epoch不提升时早停，防止过拟合。学习率可配合StepLR衰减。'
      },
      {
        step: '回测与模型对比',
        detail:
          '在2024年测试集上逐日生成涨跌预测信号: 预测涨则当日买入次日卖出(T+1模拟)，预测跌则空仓。统计三种模型的准确率、年化收益率(32.06%为最优)、最大回撤(-5.14%)等指标，绘制净值曲线对比。'
      }
    ],
    limitations: [
      '单股票(贵州茅台)回测存在严重的生存者偏差和代表性不足，结果不可外推至全市场',
      'RNN类模型在金融时序上容易过拟合: 30天窗口x6维特征对于64维hidden_size可能参数过多',
      '日频涨跌方向预测在A股T+1制度下的实际可操作性有限(当日信号次日才能执行)',
      '未考虑交易成本: 日频换手的手续费和滑点可能显著侵蚀策略收益',
      '特征维度较低(仅6维)，未包含基本面和跨市场信息',
      '训练集样本量偏小(~700)，深度学习模型可能无法充分学习市场模式',
      '未对模型预测概率做阈值优化(默认0.5分界)，调整阈值可能改善胜率'
    ],
    improvements: [
      '扩展至多股票截面预测: 使用LSTM编码每只股票的时序特征后做截面排序选股',
      '引入Attention机制(如Temporal Attention)让模型自适应关注关键历史交易日',
      '增加特征维度: 加入资金流向、融资融券余额、期权隐含波动率等高频信号',
      '使用Teacher Forcing和Scheduled Sampling改善训练稳定性',
      '集成LSTM和GRU的预测(简单平均或Stacking)，利用两种门控机制的互补性'
    ],
    conclusion:
      'Cheng (2024)的研究系统对比了三种RNN变体在股票涨跌方向预测中的表现。Vanilla LSTM在简单性和性能间取得了较好平衡，年化32.06%; Stacked LSTM理论容量更大但在小样本上易过拟合; GRU参数更少但精度接近LSTM。30天窗口能捕捉月度级别的趋势模式，RSI和MACD等技术特征对预测有显著贡献。然而单股票日频策略的实用性有限，未来应向多股票截面预测和更丰富的特征体系扩展。'
  },

  // ============================================================
  // 10. Quantformer: 从注意力到收益
  // ============================================================
  'quantformer-zhang2024': {
    modelId: 'quantformer-zhang2024',
    researchBackground:
      'Transformer架构自2017年在NLP领域取得突破以来，其自注意力机制在金融时序建模中也展现出独特优势: 能直接关联任意两个时间步而不受RNN的序列瓶颈限制。Zhang (2024) 提出Quantformer策略，使用Encoder-only Transformer模型预测贵州茅台次日涨跌方向。与LSTM按时间步逐一处理不同，Transformer通过自注意力机制并行处理整个30天窗口，能同时捕捉短期动量(近5日)和中期周期(20日)模式。',
    algorithmIntroduction:
      'Quantformer采用Encoder-only Transformer架构，属于注意力机制模型族。输入序列首先经过线性投影层将6维特征映射到d_model维(如64维)，然后加入正弦位置编码以注入时序位置信息。Transformer Encoder由多个相同层堆叠而成，每层包含: (1) 多头自注意力(Multi-Head Self-Attention)子层; (2) 位置前馈网络(FFN)子层; 两者均配有残差连接和层归一化。自注意力通过Q/K/V矩阵计算任意两个时间步的相关性权重，FFN则对每个位置独立做非线性变换。最终对序列取平均(或取最后位置)后接FC层输出涨跌概率。核心超参数: d_model=64, n_heads=4, n_layers=2, d_ff=128, dropout=0.1。',
    formulaExplanations: [
      {
        formula: 'PE_{(pos,2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)',
        explanation:
          '正弦位置编码(偶数维): pos为时间步位置(0-29对应30天)，i为维度索引。不同频率的正弦函数使得模型能区分不同位置。低频维度编码全局位置(第1天vs第30天)，高频维度编码局部位置(相邻天)。在金融时序中，位置编码帮助模型理解「5天前的RSI信号」和「20天前的RSI信号」的重要性差异。'
      },
      {
        formula: 'PE_{(pos,2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)',
        explanation:
          '正弦位置编码(奇数维): 与偶数维的sin互补，cos编码提供了正交的位置信息。sin和cos组合使得任意两个位置的编码差可以通过线性变换得到，这意味着模型可以学习相对位置关系(如「3天前」而非「第27天」)。'
      },
      {
        formula: '\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
        explanation:
          '缩放点积注意力: Q(Query)、K(Key)、V(Value)分别由输入经线性投影得到。QK^T计算任意两个时间步的相关性分数，除以\\sqrt{d_k}防止内积过大导致softmax饱和。softmax归一化得到注意力权重，加权V得到输出。在股票预测中，模型自动发现哪些历史交易日与预测日最相关。'
      },
      {
        formula: '\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1, ..., \\text{head}_h)W^O',
        explanation:
          '多头注意力: 将Q/K/V分成h个头(本策略h=4)，每个头独立计算注意力后拼接。多头机制允许不同头关注不同模式: 头1可能关注短期动量(近3天)，头2关注周期性(每5天)，头3关注波动率聚集效应。W^O是输出投影矩阵。'
      }
    ],
    stepDetails: [
      {
        step: '特征工程与序列构建',
        detail:
          '与LSTM策略相同的6维特征(close_pct, volume_pct, rsi, macd_hist, bb_pctb, volatility)，30天滑动窗口。Transformer对输入顺序敏感(通过位置编码)，因此序列必须保持时间顺序。'
      },
      {
        step: 'Transformer Encoder模型构建',
        detail:
          '架构: Linear(6, 64) + PositionalEncoding(64) + TransformerEncoderLayer(d_model=64, nhead=4, dim_feedforward=128, dropout=0.1) x 2层 + MeanPooling + FC(64, 1) + Sigmoid。总参数量约50K，比Stacked LSTM更多但训练更快(可并行)。'
      },
      {
        step: '训练配置与优化',
        detail:
          'Adam优化器(lr=1e-3, weight_decay=1e-5)，BCE损失，50 epochs，batch_size=32。使用CosineAnnealingLR学习率调度器。Transformer对学习率敏感，Warmup(前5个epoch线性增加lr)可改善初期训练稳定性。'
      },
      {
        step: '注意力权重可视化',
        detail:
          '提取自注意力层的权重矩阵(30x30)，生成热力图。横轴为Query位置(当前时步)，纵轴为Key位置(被关注的历史时步)。分析模型关注模式: 近期偏向(关注最近5天)vs远期回溯(关注20天前)。'
      },
      {
        step: '回测与LSTM对比',
        detail:
          '使用相同的2024年测试集比较Quantformer与LSTM策略的准确率、收益率和最大回撤。Transformer通常在序列较长时优势更明显(并行计算+全局注意力)，在30天短序列上优势可能不显著。'
      }
    ],
    limitations: [
      'Transformer在短序列(30天)上的优势不如在长序列(如NLP的512+ token)上明显',
      '位置编码设计(正弦vs可学习)可能不完全适合金融时序的非均匀重要性分布',
      '自注意力的O(L^2)复杂度在当前30天窗口下不是问题，但扩展到更长窗口时需关注',
      '模型过拟合风险较高: 50K参数对700个训练样本可能过参数化',
      '训练数据期较短(3年)可能不具有统计代表性',
      '未考虑交易成本对高换手策略的影响',
      '单股票策略的生存者偏差问题'
    ],
    improvements: [
      '引入跨资产注意力(Cross-Attention): 将其他相关股票或指数序列作为Key/Value输入，实现多股票联动建模',
      '加入交易量和资金流序列作为额外的Key/Value输入，丰富注意力的信息来源',
      '使用预训练+微调范式: 先在大规模股票数据上预训练Transformer，再在目标股票上微调',
      '尝试Flash Attention或Linear Attention降低计算复杂度，支持更长的历史窗口输入'
    ],
    conclusion:
      'Zhang (2024)的Quantformer策略展示了Transformer自注意力机制在金融时序预测中的应用潜力。多头注意力能同时捕捉多尺度的时序依赖模式，注意力权重热力图提供了直观的可解释性。然而在30天短序列的单股票场景中，Transformer相对LSTM的优势不够显著。Transformer的真正价值在于扩展到长序列(>100天)和多资产联合建模的场景。注意力模式分析揭示了模型倾向于关注最近5个交易日，符合短期动量效应的金融直觉。'
  },

  // ============================================================
  // 11. AlphaNetV4: Bi-LSTM + Transformer
  // ============================================================
  'alphanet-v4-wu2024': {
    modelId: 'alphanet-v4-wu2024',
    researchBackground:
      '纯LSTM缺乏全局视野，纯Transformer在短序列上位置编码不足。Wu (2024) 提出AlphaNetV4混合架构，先用Bi-LSTM提取局部时序特征(前向+后向的双向上下文)，再送入Transformer Encoder捕捉全局依赖。该架构灵感来自Alpha因子挖掘: Bi-LSTM负责提取低级时序模式(如短期反转、趋势延续)，Transformer负责在这些模式之间建立长程关联。论文报告IC均值8.08%、IR 1.52的优秀因子表现。',
    algorithmIntroduction:
      'AlphaNetV4属于混合深度学习架构族，融合了RNN和Transformer两大范式的优势。第一阶段使用双向LSTM(Bi-LSTM): 前向LSTM从t=1到t=T顺序编码，后向LSTM从t=T到t=1逆序编码，两个方向的隐藏状态拼接得到h_t=[h_t_forward; h_t_backward]，包含了每个时间步的双向上下文信息。第二阶段将Bi-LSTM输出序列加上位置编码后送入Transformer Encoder，自注意力机制在Bi-LSTM已提取的局部特征上建模全局依赖。这种两阶段设计避免了纯Transformer在短金融序列上位置编码信息不足的问题。模型使用30天窗口x6维特征，Bi-LSTM hidden=32(双向拼接为64)，Transformer d_model=64, nhead=4, 2层。',
    formulaExplanations: [
      {
        formula: '\\overrightarrow{h_t} = \\text{LSTM}_{\\text{forward}}(x_t, \\overrightarrow{h_{t-1}})',
        explanation:
          '前向LSTM: 从第1天到第30天顺序处理，h_t编码了从历史到当前的信息。在股票预测中，前向方向捕捉趋势延续模式(过去的涨势是否持续)。hidden_size=32，每个方向32维。'
      },
      {
        formula: '\\overleftarrow{h_t} = \\text{LSTM}_{\\text{backward}}(x_t, \\overleftarrow{h_{t+1}})',
        explanation:
          '后向LSTM: 从第30天到第1天逆序处理，h_t编码了从未来到当前的信息。注意: 在训练时后向LSTM可以看到「未来」(窗口内)信息，但在预测时最后一个时间步的后向状态仅依赖于当前步。后向方向有助于捕捉反转模式。'
      },
      {
        formula: 'h_t = [\\overrightarrow{h_t}; \\overleftarrow{h_t}]',
        explanation:
          '双向拼接: 将前向32维和后向32维拼接为64维向量。每个时间步t的h_t同时包含了过去信息(前向)和窗口内上下文(后向)。这为后续Transformer提供了更丰富的局部特征表示。'
      },
      {
        formula: 'Z = \\text{TransformerEncoder}(\\text{PE}(H_{\\text{BiLSTM}}))',
        explanation:
          '全局依赖建模: Bi-LSTM输出H(30x64)加上位置编码后送入Transformer Encoder(2层, 4头)。Transformer的自注意力在已经编码了局部上下文的特征上建模全局依赖，例如发现第5天和第25天的局部模式之间的远程关联。Z为最终的上下文感知表示。'
      }
    ],
    stepDetails: [
      {
        step: '特征构建与序列化',
        detail:
          '与LSTM策略相同的6维特征和30天窗口。AlphaNetV4对输入不做额外变换，双向编码和全局注意力由模型内部完成。StandardScaler标准化在训练集上fit，应用到测试集。'
      },
      {
        step: '第一阶段: Bi-LSTM局部特征提取',
        detail:
          'nn.LSTM(input_size=6, hidden_size=32, bidirectional=True, batch_first=True)。输出形状(batch, 30, 64)。Bi-LSTM在每个时间步输出前向+后向上下文的融合表示。dropout=0.2防止过拟合。'
      },
      {
        step: '第二阶段: Transformer全局建模',
        detail:
          '对Bi-LSTM输出(30x64)加上可学习的位置编码(或正弦编码)后送入TransformerEncoderLayer(d_model=64, nhead=4, dim_feedforward=128) x 2层。Transformer在局部特征上建立全局关联。'
      },
      {
        step: '输出层与IC评估',
        detail:
          '取Transformer输出序列的最后时间步(或全序列均值)经FC(64,1)+Sigmoid输出概率。除准确率外，计算Information Coefficient(IC): 模型预测值与实际收益率的Spearman秩相关系数。IC>5%被认为是有预测力的因子。'
      },
      {
        step: '训练与消融实验',
        detail:
          '对比: (1) 纯Bi-LSTM; (2) 纯Transformer; (3) AlphaNetV4混合。混合架构通常在IC和IR上优于单一架构，证明两阶段设计的互补价值。Adam(lr=1e-3), BCE损失, 50 epochs。'
      }
    ],
    limitations: [
      '混合架构的参数量(~70K)相对训练样本量(~700)过大，过拟合风险高',
      '训练数据期(3年)对于深度学习模型可能不够充分',
      '单股票(贵州茅台)的IC/IR指标无法反映横截面选股能力',
      'Bi-LSTM的后向方向在实际预测时(最后一个时间步)只有当前步信息，与训练时不一致',
      '未考虑交易成本对日频策略的侵蚀',
      '模型复杂度较高，超参数空间大(LSTM hidden_size, Transformer d_model, nhead, n_layers等)难以充分搜索'
    ],
    improvements: [
      '扩展到多股票横截面预测: 每只股票独立生成Bi-LSTM+Transformer特征后做截面排序',
      '加入行业/市值因子进行中性化处理，消除预测信号中的风格暴露',
      '使用IC加权集成多个模型的预测: IC高的模型权重大，IC下降时自动降权',
      '引入对比学习(Contrastive Learning)预训练: 让模型学习区分上涨和下跌股票的表示'
    ],
    conclusion:
      'Wu (2024)的AlphaNetV4展示了Bi-LSTM+Transformer混合架构在金融时序预测中的协同优势。Bi-LSTM的双向编码提供了丰富的局部时序特征，Transformer的自注意力在此基础上建立全局依赖。两阶段设计避免了单一架构的局限: 纯LSTM缺乏全局视野，纯Transformer在短序列上位置编码不足。论文报告的IC=8.08%和IR=1.52在学术界属于较高水平。然而在实际应用中，需要扩展到多股票截面预测并加入中性化处理才能构建可交易的选股策略。'
  },

  // ============================================================
  // 12. CNN-LSTM 量化选股策略
  // ============================================================
  'cnn-lstm-zhuang2022': {
    modelId: 'cnn-lstm-zhuang2022',
    researchBackground:
      '股票价格序列中既包含局部模式(如三日反转、跳空缺口)又包含中期趋势(如20日移动平均方向)。单一LSTM在处理长序列时可能丢失局部细节，而CNN擅长局部特征提取但缺乏时序记忆能力。Zhuang (2022) 提出CNN-LSTM混合架构: 先用一维卷积(Conv1D)提取局部价格模式，MaxPooling降噪降维后送入LSTM建模中期时序依赖。该「先局部后全局」的层级设计在计算机视觉的时序任务中已被验证有效。',
    algorithmIntroduction:
      'CNN-LSTM属于混合深度学习架构族，结合了卷积神经网络的局部特征提取和循环神经网络的时序建模能力。第一阶段: 1D卷积层(Conv1D)使用大小为K=3的滤波器在时间维度上滑动，ReLU激活后提取局部模式。每个卷积核学习一种特定的局部特征(如连续3天上涨模式)。MaxPooling(stride=2)每2个位置取最大值，实现降噪和降维(序列长度减半)。第二阶段: LSTM在卷积特征序列上建模中期依赖。由于MaxPooling已经去除了高频噪声，LSTM能更聚焦于有意义的时序结构。本策略: Conv1D(6, 32, kernel=3, padding=1) + ReLU + MaxPool(2) + LSTM(32, 64) + FC(64, 1) + Sigmoid。',
    formulaExplanations: [
      {
        formula: 'h_i^{(l)} = \\text{ReLU}\\left(\\sum_{k=0}^{K-1} W_k^{(l)} \\cdot x_{i+k} + b^{(l)}\\right)',
        explanation:
          '1D卷积操作: 滤波器l在位置i对K=3个连续时间步的特征做加权求和再经ReLU激活。每个滤波器学习一种局部模式，如W可能学到[+1, -1, +1]检测V型反转。32个滤波器并行提取32种不同的局部模式。padding=1保持序列长度不变。'
      },
      {
        formula: 'p_i = \\max(h_{2i}, h_{2i+1})',
        explanation:
          'MaxPooling(stride=2): 每两个相邻位置取最大值，序列长度从30减至15。MaxPooling的作用: (1) 去除高频噪声(微小波动不影响最大值); (2) 降低LSTM输入序列长度，减少计算量和梯度消失风险; (3) 保留最显著的局部激活(最强的价格模式信号)。'
      },
      {
        formula: 'h_t = \\text{LSTM}(p_t, h_{t-1}, C_{t-1})',
        explanation:
          'LSTM在卷积特征上的时序建模: 输入p_t为第t个池化后的局部特征(32维)，LSTM(hidden=64)在这些局部特征之间建模中期依赖。由于输入已经是高层次的卷积特征而非原始价格数据，LSTM能更高效地学习趋势延续和反转的时序规律。'
      },
      {
        formula: '\\hat{y} = \\sigma(W_{fc} \\cdot h_T + b_{fc})',
        explanation:
          '全连接输出层: 取LSTM最后时间步的隐藏状态h_T(64维)经线性变换+Sigmoid输出[0,1]概率。概率>0.5预测涨，<0.5预测跌。Sigmoid确保输出在概率空间内，可直接用BCELoss训练。'
      }
    ],
    stepDetails: [
      {
        step: '特征构建与30天窗口序列化',
        detail:
          '6维特征(close_pct, volume_pct, rsi, macd_hist, bb_pctb, volatility)构建30天滑动窗口，形状(batch, 30, 6)。CNN-LSTM需要将通道维转置: PyTorch Conv1d输入为(batch, channels, length)=(batch, 6, 30)。'
      },
      {
        step: 'Conv1D局部特征提取',
        detail:
          'nn.Conv1d(in_channels=6, out_channels=32, kernel_size=3, padding=1): 32个3-day卷积核在6维特征上滑动。padding=1保持序列长度=30。ReLU激活后每个位置有32维特征，表示该位置周围3天的局部模式强度。'
      },
      {
        step: 'MaxPooling降噪降维',
        detail:
          'nn.MaxPool1d(kernel_size=2): 序列长度从30降至15，每2个位置保留最大响应。池化后转置回(batch, 15, 32)的形状供LSTM输入。降维后LSTM的计算量减半，梯度传播路径缩短。'
      },
      {
        step: 'LSTM时序建模',
        detail:
          'nn.LSTM(input_size=32, hidden_size=64, num_layers=1): 在15步的卷积特征序列上建模。取最后时步隐藏状态(64维)作为整个序列的表示。单层LSTM已足够(卷积预处理已降噪)。'
      },
      {
        step: '训练与回测',
        detail:
          'Adam(lr=1e-3), BCE损失, 50 epochs, batch=32。2021-2023训练, 2024测试。与纯LSTM对比: CNN预处理减少噪声后LSTM收敛更快，训练损失更平稳。在趋势明显的行情中CNN-LSTM优势更大。'
      }
    ],
    limitations: [
      '固定kernel_size=3的卷积只能捕捉3天的局部模式，5天/10天的模式无法直接提取',
      'MaxPooling丢失了时间位置信息(不知道最大值来自哪一天)，可能损失重要的时序细节',
      '单股票回测(贵州茅台)存在生存者偏差',
      '模型过拟合风险较高: CNN+LSTM组合参数较多',
      '训练数据期较短(3年)可能不具代表性',
      '未考虑交易成本和T+1交易限制'
    ],
    improvements: [
      '多尺度卷积核(kernel_size=3,5,7)并行提取不同周期的局部模式，拼接后送入LSTM',
      '加入残差连接(ResNet风格)缓解深层CNN-LSTM的梯度退化问题',
      '使用Dilated Conv1D(膨胀卷积)扩大感受野: dilation=1/2/4使得有效感受野为3/5/9而不增加参数',
      '替换MaxPooling为Average Pooling或Attention Pooling，保留更多信息'
    ],
    conclusion:
      'Zhuang (2022)的CNN-LSTM架构展示了「局部提取+全局建模」的层级设计在股票预测中的效果。3-day卷积核捕捉了短期价格模式(如V型反转、连续涨跌)，MaxPooling降噪后LSTM聚焦于中期趋势建模。与纯LSTM对比，CNN预处理使LSTM训练更稳定、收敛更快。在趋势行情中表现优于震荡行情。主要改进方向是引入多尺度卷积核和膨胀卷积以覆盖更丰富的时间尺度。'
  },

  // ============================================================
  // 13. CNN-BiLSTM-Attention 股票预测策略
  // ============================================================
  'cnn-bilstm-attention-zhang2023': {
    modelId: 'cnn-bilstm-attention-zhang2023',
    researchBackground:
      '标准LSTM取最后时步隐藏状态作为序列表示，隐含假设最后时步最重要。然而在金融时序中，关键信息可能分布在任意历史时间步(如一周前的突破信号)。Zhang (2023) 提出CNN-BiLSTM-Attention四阶段架构: CNN提取局部特征，BiLSTM编码双向上下文，Attention机制自动为不同时间步分配权重，最后FC层输出预测。注意力机制使得模型既能聚焦于关键时间步，又提供了直观的可解释性(哪些天被重点关注)。策略取得年化35.16%收益率。',
    algorithmIntroduction:
      'CNN-BiLSTM-Attention属于带注意力机制的混合深度学习架构族。四阶段流水线: (1) Conv1D + ReLU提取局部模式; (2) Bi-LSTM双向编码时序上下文，输出H=[h_1,...,h_T]所有隐藏状态; (3) 注意力层: 对H的每个时间步计算注意力分数alpha_t=softmax(W_a*tanh(W_h*h_t))，加权求和得到上下文向量c=sum(alpha_t*h_t); (4) FC+Sigmoid分类。注意力层的核心贡献是自适应聚焦: 不同样本(不同日期的30天窗口)的注意力分布不同，模型能根据当时的市场状态决定关注哪些历史信息。注意力权重alpha_t直接反映了各时间步的重要性，是天然的可解释性指标。',
    formulaExplanations: [
      {
        formula: 'c_t = \\text{ReLU}(W_{conv} * x_{t:t+k} + b_{conv})',
        explanation:
          '1D卷积层: 与CNN-LSTM相同，kernel_size=3的卷积核提取连续3天的局部特征模式。ReLU激活保留正响应(检测到匹配模式时激活)。32个卷积核并行提取32种不同的局部模式。'
      },
      {
        formula: '\\overrightarrow{h_t} = \\text{LSTM}_{fwd}(c_t, \\overrightarrow{h_{t-1}})',
        explanation:
          '前向LSTM: 在卷积特征序列上从左到右编码。前向隐藏状态编码了从历史到当前的信息积累，适合捕捉趋势延续模式(如连续上涨后继续上涨)。hidden_size=32。'
      },
      {
        formula: '\\overleftarrow{h_t} = \\text{LSTM}_{bwd}(c_t, \\overleftarrow{h_{t+1}})',
        explanation:
          '后向LSTM: 从右到左编码。后向隐藏状态在训练时包含了当前时步之后的上下文信息，有助于理解「当前模式在后续是否延续」。与前向拼接后得到完整的双向上下文表示。'
      },
      {
        formula: 'h_t = [\\overrightarrow{h_t}; \\overleftarrow{h_t}]',
        explanation:
          '双向拼接: 每个时间步得到64维(32+32)的表示，同时包含过去和窗口内上下文。所有时间步的拼接表示H=[h_1,...,h_T]将送入注意力层，而非只取最后时步。这是注意力机制的前提: 需要所有时间步的表示来计算加权。'
      }
    ],
    stepDetails: [
      {
        step: 'CNN局部特征提取',
        detail:
          'Conv1d(6, 32, kernel_size=3, padding=1) + ReLU。提取30天序列中的3天局部模式。可选加入MaxPool降维，但本策略保持全序列送入BiLSTM以保留更多时序细节。'
      },
      {
        step: 'Bi-LSTM双向时序编码',
        detail:
          'nn.LSTM(32, 32, bidirectional=True, batch_first=True)。输出所有时间步的隐藏状态(batch, 30, 64)。双向编码使得每个时间步都包含完整的上下文信息，为注意力计算提供了丰富的候选。'
      },
      {
        step: '注意力权重计算',
        detail:
          '注意力层: score_t = tanh(W_h * h_t + b_h); alpha_t = softmax(v * score_t)。W_h(64, 32)和v(32, 1)为可学习参数。alpha是长度为30的概率分布，最高注意力的时间步被重点关注。上下文向量c = sum(alpha_t * h_t)为64维。'
      },
      {
        step: '分类输出与注意力可视化',
        detail:
          'FC(64, 1) + Sigmoid输出涨跌概率。训练时用BCE损失。推理时提取alpha权重绘制注意力分布图: 横轴为D-30到D-1的历史交易日，纵轴为注意力权重。模型普遍关注最近3-5天(短期动量)。'
      },
      {
        step: '回测与消融实验',
        detail:
          '对比有/无注意力的模型性能: 注意力层参数量很小(约2K)但对性能提升显著，尤其在趋势反转点的信号切换更及时。策略年化35.16%，注意力机制贡献了约3-5个百分点的收益提升。'
      }
    ],
    limitations: [
      '单头注意力可能只关注单一模式，Multi-Head Attention可捕捉多种关注模式',
      '注意力权重可能过度集中在最近几天(短视偏差)，忽略更长期的有价值信号',
      '模型复杂度较高(CNN+BiLSTM+Attention约80K参数)，在700个训练样本上过拟合风险显著',
      '单股票回测存在生存者偏差和代表性不足',
      '训练数据期较短(3年)不具统计充分性',
      '未考虑交易成本和T+1限制'
    ],
    improvements: [
      'Multi-Head Attention替代单头注意力，不同头关注不同时间尺度的模式',
      '引入交叉注意力(Cross-Attention)实现多源数据融合: 价格序列作为Query，新闻情绪或资金流作为Key/Value',
      '注意力权重正则化: 添加entropy惩罚防止注意力过度集中在少数时间步',
      '使用稀疏注意力(Top-K Attention)只关注最相关的K个时间步，减少噪声干扰'
    ],
    conclusion:
      'Zhang (2023)的CNN-BiLSTM-Attention策略在四阶段流水线中逐步提升特征质量: CNN提取局部模式、BiLSTM编码双向上下文、注意力聚焦关键时间步。策略年化35.16%，注意力机制的贡献不仅在于性能提升，更在于提供了可解释的时间步重要性分布。模型普遍关注最近3-5天，在高波动期注意力更集中。主要改进方向是升级到Multi-Head Attention和引入跨模态注意力融合异构数据源。'
  },

  // ============================================================
  // 14. CNN-LSTM 混合架构（与12区别在于此模型更侧重策略） - 跳过因为模型列表中12=cnn-lstm, 13=cnn-bilstm-attention, 14=fcnn
  // ============================================================

  // ============================================================
  // 14. 全连接神经网络 (FCNN) 量化交易策略
  // ============================================================
  'fcnn-chen2023': {
    modelId: 'fcnn-chen2023',
    researchBackground:
      '深度学习量化策略往往追求复杂架构(LSTM、Transformer、CNN混合体)，但复杂性带来的收益可能被过拟合、超参数搜索难度和部署成本抵消。Chen (2023) 分析了多种机器学习模型在频繁交易场景下的表现，其中全连接神经网络(FCNN/MLP)通过最基础的多层非线性变换捕获因子间的交互关系。该研究强调了FCNN作为深度学习baseline的价值: 如果复杂模型不能显著超越FCNN，则额外复杂度不值得。模型采用3层MLP结构配合BatchNorm和Dropout正则化。',
    algorithmIntroduction:
      'FCNN(Fully Connected Neural Network，也称MLP多层感知机)是最基础的前馈神经网络，属于深度学习基线模型族。每一层对输入做线性变换+非线性激活: h^(l) = sigma(W^(l) * h^(l-1) + b^(l))。与CNN和LSTM不同，FCNN不对输入数据的空间或时序结构做任何假设——将当日所有因子展平为一维向量直接输入。这意味着FCNN无法捕捉时序依赖(如趋势延续)，但擅长发现因子间的非线性交互(如「高RSI+低波动率」组合的预测力)。本策略采用3层结构: Input(~30维) -> FC(128)+BN+ReLU+Dropout(0.3) -> FC(64)+BN+ReLU+Dropout(0.3) -> FC(32)+BN+ReLU+Dropout(0.3) -> FC(1)+Sigmoid。BatchNorm稳定训练，Dropout防止过拟合。Adam优化器(lr=1e-3, weight_decay=1e-5)，StepLR每20 epoch衰减一半，共60 epochs。',
    formulaExplanations: [
      {
        formula: '\\mathbf{h}^{(l)} = \\sigma\\left(\\mathbf{W}^{(l)} \\mathbf{h}^{(l-1)} + \\mathbf{b}^{(l)}\\right)',
        explanation:
          '全连接层前向传播: W^(l)为权重矩阵，b^(l)为偏置，sigma为激活函数(ReLU)。每一层的神经元与上一层的所有神经元全连接，理论上可以逼近任意连续函数(万能近似定理)。在选股中，每层逐步提取更高阶的因子交互特征。'
      },
      {
        formula: '\\text{Input}(d) \\xrightarrow{\\text{FC}} 128 \\xrightarrow{\\text{BN+ReLU+Drop}} 64 \\xrightarrow{\\text{BN+ReLU+Drop}} 32 \\xrightarrow{\\text{FC}} 1 \\xrightarrow{\\text{Sigmoid}} p',
        explanation:
          '网络结构图: 约30维因子输入 -> 逐层压缩(128->64->32) -> 1维输出。压缩结构(漏斗形)迫使网络学习因子的低维紧凑表示。每层的BN+ReLU+Dropout组合是现代MLP的标准配置。总参数量: 30*128+128*64+64*32+32*1 ≈ 14K，远少于RNN/Transformer。'
      },
      {
        formula: '\\hat{x}_i = \\frac{x_i - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}} \\cdot \\gamma + \\beta',
        explanation:
          'BatchNorm归一化: 对每个mini-batch的每个神经元独立计算均值\\mu_B和方差\\sigma_B^2，归一化到零均值单位方差后再经可学习的缩放\\gamma和偏移\\beta恢复表达能力。BN加速训练收敛(允许更大学习率)、减少internal covariate shift、提供轻微正则化效果。'
      },
      {
        formula: '\\tilde{h}_i = h_i \\cdot m_i, \\quad m_i \\sim \\text{Bernoulli}(1-p)',
        explanation:
          'Dropout正则化: 训练时以概率p=0.3随机将30%的神经元输出置零(掩码m_i)。这迫使网络学习冗余表示，不依赖于任何单一神经元。推理时关闭Dropout并缩放输出(乘以1-p)。Dropout是防止FCNN在小样本(~700训练样本)上过拟合的关键技术。'
      }
    ],
    stepDetails: [
      {
        step: '丰富因子体系构建',
        detail:
          'FCNN使用了最丰富的因子体系(~30维): 6个动量(1/3/5/10/20/60日)、4个波动率(5/10/20/60日)、RSI(7日/14日)、MACD(线和直方图)、布林带、4个价格偏离均线、ATR、量价相关性、日内波幅、3个换手率因子、2个成交量变化率。因子维度越多，非线性交互组合越丰富。'
      },
      {
        step: '非序列数据准备',
        detail:
          '与CNN/LSTM不同，FCNN将当日全部因子展平为一维向量(~30维)输入，不构建滑动窗口序列。StandardScaler在训练集上fit后transform测试集。TensorDataset + DataLoader(batch=64, shuffle=True)。'
      },
      {
        step: '3层MLP训练',
        detail:
          '模型结构: FC(30,128)+BN+ReLU+Drop(0.3)+FC(128,64)+BN+ReLU+Drop(0.3)+FC(64,32)+BN+ReLU+Drop(0.3)+FC(32,1)+Sigmoid。Adam(lr=1e-3, weight_decay=1e-5)。StepLR(step_size=20, gamma=0.5)。训练60个epoch，记录每epoch的训练损失。'
      },
      {
        step: '预测与回测',
        detail:
          '在2024测试集上逐日预测涨跌概率: >0.5买入(次日卖出)，<0.5空仓。FCNN的预测不依赖于历史窗口，每天独立预测。统计准确率、年化收益率、最大回撤等指标。'
      },
      {
        step: '与时序模型对比',
        detail:
          'FCNN是非时序模型的baseline: 如果LSTM/Transformer不能显著超越FCNN，说明时序依赖对预测的边际贡献有限，因子间的静态交互可能才是收益的主要来源。这对模型选择有重要指导意义。'
      }
    ],
    limitations: [
      '不考虑时序依赖关系，无法捕捉趋势动量等时序模式，在趋势行情中可能落后于LSTM',
      '对特征工程质量高度依赖: FCNN无法自动发现时序特征，需要人工构建所有因子',
      '日频交易受A股T+1限制，预测信号到执行有1天延迟，实际收益可能打折',
      '30维因子中可能存在共线性(如多个动量因子高度相关)，增加了过拟合风险',
      '~14K参数对700个训练样本仍可能过参数化，尽管有Dropout和BatchNorm缓解',
      '缺少模型不确定性估计: 无法判断预测的置信度(高概率vs低概率的可靠性差异)'
    ],
    improvements: [
      '引入Residual Connection(残差连接): 每层加入跳跃连接缓解梯度退化，允许训练更深的网络',
      '使用TabNet或FT-Transformer等专门针对表格数据的架构替代朴素MLP',
      '添加Monte Carlo Dropout: 推理时保持Dropout激活，多次采样估计预测不确定性',
      '引入特征选择层(如SparseMax)自动学习因子的稀疏组合，减少冗余输入',
      '集成FCNN与LSTM: FCNN捕捉因子交互，LSTM捕捉时序依赖，两者预测做加权融合'
    ],
    conclusion:
      'Chen (2023)的FCNN策略以最简单的3层MLP结构配合BatchNorm+Dropout在股票方向预测中取得了可观的表现。作为深度学习量化的baseline，FCNN的价值在于: (1) 验证因子间非线性交互的预测力; (2) 为复杂时序模型提供比较基准; (3) 部署简单、推理快速。实验表明BatchNorm+Dropout的组合有效防止了小样本上的过拟合。然而FCNN完全忽略时序结构，在趋势明显的市场中可能不如RNN类模型。建议将FCNN作为多模型集成中的一个组件，与时序模型互补。'
  }
};
