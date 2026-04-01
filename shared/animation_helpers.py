"""
动画可视化辅助模块 - 用于展示算法原理的交互式/动态可视化
支持 plotly (交互式) 和 matplotlib.animation (动画GIF)
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import matplotlib.pyplot as plt
import matplotlib.animation as animation


# ==================== 决策树/集成学习动画 ====================

def animate_gradient_boosting(X, y, n_rounds=10, title="梯度提升 (Gradient Boosting) 原理"):
    """
    动画展示梯度提升逐轮拟合残差的过程
    使用plotly滑块逐步显示每轮提升
    """
    from sklearn.tree import DecisionTreeRegressor

    fig = go.Figure()
    residuals = y.copy().astype(float)
    prediction = np.zeros_like(y, dtype=float)
    frames = []

    # 初始帧
    frames.append(go.Frame(
        data=[
            go.Scatter(x=X.ravel(), y=y, mode='markers', name='真实值',
                       marker=dict(color='blue', size=5, opacity=0.6)),
            go.Scatter(x=np.sort(X.ravel()), y=np.zeros(len(X)), mode='lines',
                       name='预测值', line=dict(color='red', width=2)),
        ],
        name='Round 0'
    ))

    for r in range(1, n_rounds + 1):
        tree = DecisionTreeRegressor(max_depth=3)
        tree.fit(X.reshape(-1, 1), residuals)
        pred_r = tree.predict(X.reshape(-1, 1))
        prediction += 0.1 * pred_r  # learning rate = 0.1
        residuals = y - prediction

        sort_idx = np.argsort(X.ravel())
        frames.append(go.Frame(
            data=[
                go.Scatter(x=X.ravel(), y=y, mode='markers', name='真实值',
                           marker=dict(color='blue', size=5, opacity=0.6)),
                go.Scatter(x=X.ravel()[sort_idx], y=prediction[sort_idx],
                           mode='lines', name='预测值',
                           line=dict(color='red', width=2)),
            ],
            name=f'Round {r}'
        ))

    fig = go.Figure(
        data=frames[0].data,
        layout=go.Layout(
            title=dict(text=title),
            xaxis_title="特征 X",
            yaxis_title="目标 Y",
            updatemenus=[dict(
                type="buttons",
                buttons=[
                    dict(label="▶ 播放", method="animate",
                         args=[None, {"frame": {"duration": 500}, "transition": {"duration": 300}}]),
                    dict(label="⏸ 暂停", method="animate",
                         args=[[None], {"frame": {"duration": 0}, "mode": "immediate"}]),
                ],
            )],
            sliders=[dict(
                steps=[dict(args=[[f.name], {"frame": {"duration": 0}, "mode": "immediate"}],
                            label=f.name, method="animate")
                       for f in frames],
                active=0,
            )],
        ),
        frames=frames,
    )
    return fig


def animate_regularization_path(X, y, alphas=None, title="正则化路径 (Lasso/Ridge)"):
    """
    动画展示正则化系数路径: 随lambda增大，系数逐渐收缩
    """
    from sklearn.linear_model import Lasso, Ridge

    if alphas is None:
        alphas = np.logspace(-4, 2, 50)

    n_features = X.shape[1]
    coef_paths_lasso = []
    coef_paths_ridge = []

    for a in alphas:
        lasso = Lasso(alpha=a, max_iter=10000)
        lasso.fit(X, y)
        coef_paths_lasso.append(lasso.coef_.copy())

        ridge = Ridge(alpha=a)
        ridge.fit(X, y)
        coef_paths_ridge.append(ridge.coef_.copy())

    fig = make_subplots(rows=1, cols=2,
                        subplot_titles=["Lasso (L1正则化)", "Ridge (L2正则化)"])

    coef_lasso = np.array(coef_paths_lasso)
    coef_ridge = np.array(coef_paths_ridge)

    colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3',
              '#ff7f00', '#a65628', '#f781bf', '#999999']

    for i in range(min(n_features, 8)):
        fig.add_trace(
            go.Scatter(x=np.log10(alphas), y=coef_lasso[:, i],
                       name=f'因子{i+1}', line=dict(color=colors[i % len(colors)])),
            row=1, col=1
        )
        fig.add_trace(
            go.Scatter(x=np.log10(alphas), y=coef_ridge[:, i],
                       name=f'因子{i+1}', line=dict(color=colors[i % len(colors)]),
                       showlegend=False),
            row=1, col=2
        )

    fig.update_layout(
        title=dict(text=title),
        xaxis_title="log₁₀(λ)", xaxis2_title="log₁₀(λ)",
        yaxis_title="系数值", yaxis2_title="系数值",
        height=500, width=1000,
    )
    return fig


# ==================== LSTM / 深度学习动画 ====================

def animate_lstm_gates(sequence_length=20, title="LSTM 门控机制"):
    """
    动画展示LSTM的遗忘门、输入门、输出门如何处理时序数据
    """
    np.random.seed(42)
    t = np.arange(sequence_length)

    # 模拟门控值
    forget_gate = 1 / (1 + np.exp(-np.random.randn(sequence_length)))
    input_gate = 1 / (1 + np.exp(-np.random.randn(sequence_length)))
    output_gate = 1 / (1 + np.exp(-np.random.randn(sequence_length)))
    cell_state = np.cumsum(np.random.randn(sequence_length) * 0.3)
    hidden_state = np.tanh(cell_state) * output_gate

    frames = []
    for step in range(1, sequence_length + 1):
        frames.append(go.Frame(
            data=[
                go.Bar(x=['遗忘门', '输入门', '输出门'],
                       y=[forget_gate[step-1], input_gate[step-1], output_gate[step-1]],
                       marker_color=['#FF6B6B', '#4ECDC4', '#45B7D1'],
                       name='门控值'),
                go.Scatter(x=t[:step], y=cell_state[:step],
                           mode='lines+markers', name='细胞状态',
                           line=dict(color='orange', width=2)),
                go.Scatter(x=t[:step], y=hidden_state[:step],
                           mode='lines+markers', name='隐藏状态',
                           line=dict(color='purple', width=2)),
            ],
            name=f't={step}'
        ))

    fig = make_subplots(rows=1, cols=2, column_widths=[0.3, 0.7],
                        subplot_titles=["门控值", "状态演化"])

    # 初始数据
    fig.add_trace(go.Bar(x=['遗忘门', '输入门', '输出门'],
                         y=[0, 0, 0], marker_color=['#FF6B6B', '#4ECDC4', '#45B7D1']),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=[], y=[], mode='lines+markers', name='细胞状态',
                             line=dict(color='orange')), row=1, col=2)
    fig.add_trace(go.Scatter(x=[], y=[], mode='lines+markers', name='隐藏状态',
                             line=dict(color='purple')), row=1, col=2)

    fig.update_layout(
        title=dict(text=title),
        height=450, width=1000,
        updatemenus=[dict(type="buttons", buttons=[
            dict(label="▶ 播放", method="animate",
                 args=[None, {"frame": {"duration": 300}}]),
        ])],
        sliders=[dict(
            steps=[dict(args=[[f.name]], label=f.name, method="animate") for f in frames],
        )],
    )
    fig.frames = frames
    return fig


# ==================== 强化学习动画 ====================

def animate_rl_trading(prices, actions, rewards, title="强化学习交易过程"):
    """
    动画展示RL智能体在价格图上的交易决策过程
    """
    n = len(prices)
    frames = []

    for step in range(10, n, max(1, n // 50)):
        buy_idx = [i for i in range(step) if actions[i] == 1]
        sell_idx = [i for i in range(step) if actions[i] == -1]

        frame_data = [
            go.Scatter(x=list(range(step)), y=prices[:step],
                       mode='lines', name='价格', line=dict(color='gray', width=1.5)),
        ]

        if buy_idx:
            frame_data.append(go.Scatter(
                x=buy_idx, y=[prices[i] for i in buy_idx],
                mode='markers', name='买入',
                marker=dict(color='green', size=8, symbol='triangle-up')))
        if sell_idx:
            frame_data.append(go.Scatter(
                x=sell_idx, y=[prices[i] for i in sell_idx],
                mode='markers', name='卖出',
                marker=dict(color='red', size=8, symbol='triangle-down')))

        frames.append(go.Frame(data=frame_data, name=f'Step {step}'))

    fig = go.Figure(data=frames[0].data if frames else [],
                    frames=frames)
    fig.update_layout(
        title=dict(text=title),
        xaxis_title="时间步", yaxis_title="价格",
        height=500, width=1000,
        updatemenus=[dict(type="buttons", buttons=[
            dict(label="▶ 播放", method="animate",
                 args=[None, {"frame": {"duration": 200}}]),
        ])],
    )
    return fig


# ==================== 统计套利动画 ====================

def animate_kalman_filter(observations, title="卡尔曼滤波动态估计"):
    """
    动画展示卡尔曼滤波逐步更新预测值的过程
    """
    n = len(observations)
    # 简单一维卡尔曼滤波
    x_est = np.zeros(n)
    p_est = np.ones(n)
    x_est[0] = observations[0]
    p_est[0] = 1.0
    R = 0.5  # 观测噪声
    Q = 0.1  # 过程噪声

    for i in range(1, n):
        # 预测
        x_pred = x_est[i - 1]
        p_pred = p_est[i - 1] + Q
        # 更新
        K = p_pred / (p_pred + R)
        x_est[i] = x_pred + K * (observations[i] - x_pred)
        p_est[i] = (1 - K) * p_pred

    frames = []
    for step in range(5, n, max(1, n // 40)):
        upper = x_est[:step] + 2 * np.sqrt(p_est[:step])
        lower = x_est[:step] - 2 * np.sqrt(p_est[:step])

        frames.append(go.Frame(
            data=[
                go.Scatter(x=list(range(step)), y=observations[:step],
                           mode='markers', name='观测值',
                           marker=dict(color='blue', size=4, opacity=0.5)),
                go.Scatter(x=list(range(step)), y=x_est[:step],
                           mode='lines', name='卡尔曼估计',
                           line=dict(color='red', width=2)),
                go.Scatter(x=list(range(step)) + list(range(step))[::-1],
                           y=list(upper) + list(lower)[::-1],
                           fill='toself', fillcolor='rgba(255,0,0,0.1)',
                           line=dict(color='rgba(255,0,0,0)'),
                           name='95%置信区间'),
            ],
            name=f'Step {step}'
        ))

    fig = go.Figure(data=frames[0].data if frames else [],
                    frames=frames)
    fig.update_layout(
        title=dict(text=title),
        xaxis_title="时间", yaxis_title="值",
        height=500, width=1000,
        updatemenus=[dict(type="buttons", buttons=[
            dict(label="▶ 播放", method="animate",
                 args=[None, {"frame": {"duration": 150}}]),
        ])],
    )
    return fig


# ==================== 组合优化动画 ====================

def animate_efficient_frontier(returns_matrix, title="有效前沿 (Monte Carlo)"):
    """
    蒙特卡洛散点逐步填充风险-收益平面
    """
    n_assets = returns_matrix.shape[1]
    mean_returns = returns_matrix.mean() * 252
    cov_matrix = returns_matrix.cov() * 252
    n_portfolios = 3000

    np.random.seed(42)
    all_returns = []
    all_risks = []
    all_sharpe = []

    for _ in range(n_portfolios):
        weights = np.random.dirichlet(np.ones(n_assets))
        port_return = np.dot(weights, mean_returns)
        port_risk = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        all_returns.append(port_return)
        all_risks.append(port_risk)
        all_sharpe.append((port_return - 0.025) / port_risk if port_risk > 0 else 0)

    frames = []
    batch_size = n_portfolios // 30

    for step in range(batch_size, n_portfolios + 1, batch_size):
        frames.append(go.Frame(
            data=[go.Scatter(
                x=all_risks[:step], y=all_returns[:step],
                mode='markers', name='组合',
                marker=dict(
                    color=all_sharpe[:step],
                    colorscale='RdYlGn',
                    size=4,
                    colorbar=dict(title="夏普比率"),
                ),
            )],
            name=f'{step} 个组合'
        ))

    fig = go.Figure(data=frames[0].data if frames else [],
                    frames=frames)
    fig.update_layout(
        title=dict(text=title),
        xaxis_title="年化风险 (波动率)", yaxis_title="年化收益",
        height=600, width=800,
        updatemenus=[dict(type="buttons", buttons=[
            dict(label="▶ 播放", method="animate",
                 args=[None, {"frame": {"duration": 200}}]),
        ])],
    )
    return fig


# ==================== 通用辅助 ====================

def create_architecture_diagram(layers: list, title="模型架构"):
    """
    用plotly创建简单的神经网络架构图

    Parameters:
        layers: [("Input\n(60×6)", 6), ("LSTM\n(128)", 128), ("FC\n(64)", 64), ("Output\n(1)", 1)]
    """
    fig = go.Figure()
    n_layers = len(layers)
    x_positions = np.linspace(0, 10, n_layers)

    for i, (name, size) in enumerate(layers):
        # 画层的方框
        box_height = min(3, max(0.5, np.log2(size + 1) * 0.5))
        fig.add_shape(type="rect",
                      x0=x_positions[i] - 0.6, x1=x_positions[i] + 0.6,
                      y0=-box_height/2, y1=box_height/2,
                      fillcolor=COLOR_PALETTE[i % len(COLOR_PALETTE)],
                      opacity=0.7, line=dict(color='white', width=2))
        fig.add_annotation(x=x_positions[i], y=0, text=name,
                           showarrow=False, font=dict(size=11, color='white'))

        # 画连接箭头
        if i < n_layers - 1:
            fig.add_annotation(
                x=x_positions[i+1] - 0.7, y=0,
                ax=x_positions[i] + 0.7, ay=0,
                arrowhead=2, arrowsize=1.5, arrowwidth=2,
                arrowcolor='gray',
            )

    from .constants import COLOR_PALETTE
    fig.update_layout(
        title=dict(text=title),
        xaxis=dict(visible=False), yaxis=dict(visible=False),
        height=300, width=max(600, n_layers * 180),
        plot_bgcolor='white',
    )
    return fig
