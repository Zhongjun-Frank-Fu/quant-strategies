#!/usr/bin/env python3
"""
Parse all 46 Jupyter notebooks and extract model architecture definitions
into a TypeScript data file for the frontend visualization.

Scans code cells for:
- PyTorch nn.Module classes (LSTM, GRU, Conv1d, Transformer, Linear, etc.)
- sklearn/LightGBM/XGBoost model definitions
- Statistical models (pairs trading, portfolio optimization)

Output: vite-app/src/data/model_architectures.ts
"""

import json
import os
import re
import glob
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "vite-app", "src", "data", "model_architectures.ts")

# --------------------------------------------------------------------------
# Notebook discovery
# --------------------------------------------------------------------------
CATEGORY_DIRS = [
    "01_multi_factor",
    "02_deep_learning",
    "03_reinforcement_learning",
    "04_alpha_mining",
    "05_stat_arbitrage",
    "06_high_frequency",
    "07_portfolio_optimization",
]


def find_notebooks():
    """Find all .ipynb files in category directories."""
    notebooks = []
    for cat_dir in CATEGORY_DIRS:
        full_dir = os.path.join(BASE_DIR, cat_dir)
        if not os.path.isdir(full_dir):
            continue
        for nb_file in sorted(glob.glob(os.path.join(full_dir, "*.ipynb"))):
            notebooks.append(nb_file)
    return notebooks


def notebook_to_model_id(filepath):
    """Convert notebook filename to model ID.
    Example: 01_lightgbm_wang2023.ipynb -> lightgbm-wang2023
    """
    basename = os.path.splitext(os.path.basename(filepath))[0]
    # Remove leading NN_ prefix (e.g. 01_, 02_, etc.)
    basename = re.sub(r"^\d+_", "", basename)
    return basename.replace("_", "-")


def get_code_cells(filepath):
    """Read all code cell sources from a notebook."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            nb = json.load(f)
        cells = []
        for cell in nb.get("cells", []):
            if cell.get("cell_type") == "code":
                src = "".join(cell.get("source", []))
                cells.append(src)
        return cells
    except Exception as e:
        print(f"  [ERROR] Failed to read {filepath}: {e}")
        return []


def get_markdown_cells(filepath):
    """Read all markdown cell sources from a notebook."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            nb = json.load(f)
        cells = []
        for cell in nb.get("cells", []):
            if cell.get("cell_type") == "markdown":
                src = "".join(cell.get("source", []))
                cells.append(src)
        return cells
    except Exception:
        return []


# --------------------------------------------------------------------------
# Regex-based layer extraction for PyTorch nn.Module classes
# --------------------------------------------------------------------------

def extract_int(text, default=0):
    """Extract first integer from text."""
    m = re.search(r"\d+", text)
    return int(m.group()) if m else default


def extract_float(text, default=0.0):
    """Extract first float/int from text."""
    m = re.search(r"[\d.]+", text)
    return float(m.group()) if m else default


def parse_nn_lstm(line):
    """Parse nn.LSTM(...) or nn.GRU(...)."""
    layer_type = "LSTM" if "LSTM" in line else "GRU"
    # nn.LSTM(input_size, hidden_size, num_layers=N, ...)
    m = re.search(r"nn\.\w+\(([^)]+)\)", line)
    if not m:
        return None
    args_str = m.group(1)
    args = [a.strip() for a in args_str.split(",")]

    params = {}
    positional = []
    for arg in args:
        if "=" in arg:
            key, val = arg.split("=", 1)
            key = key.strip()
            val = val.strip()
            if key == "bidirectional":
                params["bidirectional"] = val.strip() == "True"
            elif key == "num_layers":
                params["num_layers"] = extract_int(val, 1)
            elif key in ("batch_first", "dropout"):
                pass  # skip these for display
        else:
            positional.append(arg)

    # Try to resolve positional args
    input_size = positional[0] if len(positional) > 0 else "?"
    hidden_size = positional[1] if len(positional) > 1 else "?"

    # Try numeric resolution
    try:
        input_size_num = int(input_size)
    except (ValueError, TypeError):
        input_size_num = input_size
    try:
        hidden_size_num = int(hidden_size)
    except (ValueError, TypeError):
        hidden_size_num = hidden_size

    params["input_size"] = input_size_num
    params["hidden_size"] = hidden_size_num
    if "num_layers" not in params:
        params["num_layers"] = 1

    bidir = params.get("bidirectional", False)
    prefix = "Bi-" if bidir else ""
    label = f"{prefix}{layer_type}({input_size_num}->{hidden_size_num})"

    return {"type": layer_type if not bidir else f"Bi{layer_type}",
            "label": label, "params": params}


def parse_nn_linear(line):
    """Parse nn.Linear(in, out)."""
    m = re.search(r"nn\.Linear\(([^)]+)\)", line)
    if not m:
        return None
    args = [a.strip() for a in m.group(1).split(",")]
    in_f = args[0] if args else "?"
    out_f = args[1] if len(args) > 1 else "?"

    try:
        in_f_num = int(in_f)
    except (ValueError, TypeError):
        in_f_num = in_f
    try:
        out_f_num = int(out_f)
    except (ValueError, TypeError):
        out_f_num = out_f

    params = {"in_features": in_f_num, "out_features": out_f_num}
    return {"type": "Linear", "label": f"FC({in_f_num}->{out_f_num})", "params": params}


def parse_nn_conv1d(line):
    """Parse nn.Conv1d(in_channels, out_channels, kernel_size, ...)."""
    m = re.search(r"nn\.Conv1d\(([^)]+)\)", line)
    if not m:
        return None
    args_str = m.group(1)
    args = [a.strip() for a in args_str.split(",")]

    positional = []
    kw = {}
    for arg in args:
        if "=" in arg:
            k, v = arg.split("=", 1)
            kw[k.strip()] = v.strip()
        else:
            positional.append(arg)

    in_ch = positional[0] if len(positional) > 0 else "?"
    out_ch = positional[1] if len(positional) > 1 else "?"
    ks = positional[2] if len(positional) > 2 else kw.get("kernel_size", "?")

    try:
        in_ch = int(in_ch)
    except (ValueError, TypeError):
        pass
    try:
        out_ch = int(out_ch)
    except (ValueError, TypeError):
        pass
    try:
        ks = int(ks)
    except (ValueError, TypeError):
        pass

    params = {"in_channels": in_ch, "out_channels": out_ch, "kernel_size": ks}
    return {"type": "Conv1d", "label": f"Conv1d({in_ch}->{out_ch}, k={ks})", "params": params}


def parse_nn_transformer_encoder_layer(line):
    """Parse nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward, ...)."""
    m = re.search(r"nn\.TransformerEncoderLayer\(([^)]+)\)", line)
    if not m:
        return None
    args_str = m.group(1)
    kw = {}
    positional = []
    for arg in [a.strip() for a in args_str.split(",")]:
        if "=" in arg:
            k, v = arg.split("=", 1)
            kw[k.strip()] = v.strip()
        else:
            positional.append(arg)

    d_model = kw.get("d_model", positional[0] if positional else "?")
    nhead = kw.get("nhead", positional[1] if len(positional) > 1 else "?")
    dim_ff = kw.get("dim_feedforward", positional[2] if len(positional) > 2 else "?")

    try:
        d_model = int(d_model)
    except (ValueError, TypeError):
        pass
    try:
        nhead = int(nhead)
    except (ValueError, TypeError):
        pass
    try:
        dim_ff = int(dim_ff)
    except (ValueError, TypeError):
        pass

    params = {"d_model": d_model, "nhead": nhead, "dim_feedforward": dim_ff}
    return {"type": "TransformerEncoderLayer",
            "label": f"TransformerEncoderLayer(d={d_model}, h={nhead})",
            "params": params}


def parse_nn_transformer_encoder(line):
    """Parse nn.TransformerEncoder(encoder_layer, num_layers=N)."""
    m = re.search(r"nn\.TransformerEncoder\(([^)]+)\)", line)
    if not m:
        return None
    args_str = m.group(1)
    kw = {}
    positional = []
    for arg in [a.strip() for a in args_str.split(",")]:
        if "=" in arg:
            k, v = arg.split("=", 1)
            kw[k.strip()] = v.strip()
        else:
            positional.append(arg)

    num_layers = kw.get("num_layers", positional[1] if len(positional) > 1 else "?")
    try:
        num_layers = int(num_layers)
    except (ValueError, TypeError):
        pass

    params = {"num_layers": num_layers}
    return {"type": "TransformerEncoder",
            "label": f"TransformerEncoder(layers={num_layers})",
            "params": params}


def parse_nn_dropout(line):
    m = re.search(r"nn\.Dropout\(([^)]*)\)", line)
    if not m:
        return None
    p_str = m.group(1).strip()
    if "=" in p_str:
        p_str = p_str.split("=")[1].strip()
    try:
        p = float(p_str)
    except (ValueError, TypeError):
        p = 0.0
    return {"type": "Dropout", "label": f"Dropout({p})", "params": {"p": p}}


def parse_nn_batchnorm(line):
    m = re.search(r"nn\.BatchNorm1d\((\d+)\)", line)
    if not m:
        return None
    n = int(m.group(1))
    return {"type": "BatchNorm1d", "label": f"BatchNorm1d({n})", "params": {"num_features": n}}


def parse_nn_layernorm(line):
    m = re.search(r"nn\.LayerNorm\((\d+)\)", line)
    if not m:
        return None
    n = int(m.group(1))
    return {"type": "LayerNorm", "label": f"LayerNorm({n})", "params": {"normalized_shape": n}}


def parse_nn_activation(line):
    for act in ["ReLU", "Sigmoid", "Tanh", "Softmax", "LeakyReLU", "GELU"]:
        if f"nn.{act}" in line:
            return {"type": act, "label": act}
    return None


def parse_nn_maxpool(line):
    m = re.search(r"nn\.MaxPool1d\(.*?kernel_size\s*=\s*(\d+)|nn\.MaxPool1d\((\d+)", line)
    if not m:
        return None
    ks = int(m.group(1) or m.group(2))
    return {"type": "MaxPool1d", "label": f"MaxPool1d(k={ks})", "params": {"kernel_size": ks}}


def parse_init_method(code):
    """Parse __init__ method of an nn.Module class to extract layers."""
    layers = []
    lines = code.split("\n")
    for line in lines:
        line_stripped = line.strip()

        # Skip comments and empty
        if line_stripped.startswith("#") or not line_stripped:
            continue

        # LSTM / GRU
        if re.search(r"nn\.(LSTM|GRU)\(", line_stripped):
            layer = parse_nn_lstm(line_stripped)
            if layer:
                layers.append(layer)

        # Linear
        if "nn.Linear(" in line_stripped:
            layer = parse_nn_linear(line_stripped)
            if layer:
                layers.append(layer)

        # Conv1d
        if "nn.Conv1d(" in line_stripped:
            layer = parse_nn_conv1d(line_stripped)
            if layer:
                layers.append(layer)

        # TransformerEncoderLayer
        if "nn.TransformerEncoderLayer(" in line_stripped:
            layer = parse_nn_transformer_encoder_layer(line_stripped)
            if layer:
                layers.append(layer)

        # TransformerEncoder
        if "nn.TransformerEncoder(" in line_stripped and "Layer" not in line_stripped:
            layer = parse_nn_transformer_encoder(line_stripped)
            if layer:
                layers.append(layer)

        # Dropout
        if "nn.Dropout(" in line_stripped:
            layer = parse_nn_dropout(line_stripped)
            if layer:
                layers.append(layer)

        # BatchNorm1d
        if "nn.BatchNorm1d(" in line_stripped:
            layer = parse_nn_batchnorm(line_stripped)
            if layer:
                layers.append(layer)

        # LayerNorm
        if "nn.LayerNorm(" in line_stripped:
            layer = parse_nn_layernorm(line_stripped)
            if layer:
                layers.append(layer)

        # MaxPool1d
        if "nn.MaxPool1d(" in line_stripped:
            layer = parse_nn_maxpool(line_stripped)
            if layer:
                layers.append(layer)

        # Activations
        if re.search(r"nn\.(ReLU|Sigmoid|Tanh|Softmax|LeakyReLU|GELU)", line_stripped):
            layer = parse_nn_activation(line_stripped)
            if layer:
                layers.append(layer)

    return layers


def extract_class_blocks(code):
    """Extract class blocks (class Name(nn.Module): ...) from code."""
    classes = {}
    # Find all class definitions
    pattern = r"class\s+(\w+)\s*\([^)]*(?:nn\.Module|nn\.module)[^)]*\)\s*:"
    for m in re.finditer(pattern, code, re.IGNORECASE):
        class_name = m.group(1)
        start = m.start()
        # Find the __init__ method
        init_match = re.search(r"def\s+__init__\s*\(self[^)]*\)\s*:", code[start:])
        if not init_match:
            continue
        init_start = start + init_match.end()

        # Find the end of __init__ (next def or class at same/higher indent)
        remaining = code[init_start:]
        # Find next method definition at same level
        end_match = re.search(r"\n    def\s+", remaining)
        if end_match:
            init_code = remaining[:end_match.start()]
        else:
            # Find next class definition
            end_match2 = re.search(r"\nclass\s+", remaining)
            if end_match2:
                init_code = remaining[:end_match2.start()]
            else:
                init_code = remaining[:2000]  # fallback: take 2000 chars

        classes[class_name] = init_code

    return classes


def extract_lgb_params(all_code):
    """Extract LightGBM parameters from lgb_params dict."""
    params = {}
    # Look for lgb_params = { ... } or params = { ... 'boosting_type': 'gbdt' ... }
    m = re.search(r"(?:lgb_params|params)\s*=\s*\{([^}]+)\}", all_code, re.DOTALL)
    if not m:
        return params

    params_str = m.group(1)
    for pair_m in re.finditer(r"'(\w+)'\s*:\s*(['\"]?[\w.\-]+['\"]?)", params_str):
        key = pair_m.group(1)
        val = pair_m.group(2).strip("'\"")
        if key in ("verbose", "seed", "random_state", "n_jobs"):
            continue
        try:
            if "." in val:
                params[key] = float(val)
            else:
                params[key] = int(val)
        except ValueError:
            params[key] = val
    return params


def extract_xgb_params(all_code):
    """Extract XGBoost parameters."""
    params = {}
    m = re.search(r"(?:xgb_params|params)\s*=\s*\{([^}]+)\}", all_code, re.DOTALL)
    if not m:
        return params
    params_str = m.group(1)
    for pair_m in re.finditer(r"'(\w+)'\s*:\s*(['\"]?[\w.\-]+['\"]?)", params_str):
        key = pair_m.group(1)
        val = pair_m.group(2).strip("'\"")
        if key in ("verbose", "seed", "random_state", "nthread"):
            continue
        try:
            if "." in val:
                params[key] = float(val)
            else:
                params[key] = int(val)
        except ValueError:
            params[key] = val
    return params


# --------------------------------------------------------------------------
# Main architecture extraction per notebook
# --------------------------------------------------------------------------

def extract_architecture(filepath):
    """Extract model architecture from a single notebook."""
    model_id = notebook_to_model_id(filepath)
    code_cells = get_code_cells(filepath)
    md_cells = get_markdown_cells(filepath)
    all_code = "\n".join(code_cells)
    all_md = "\n".join(md_cells)

    # Get title from first markdown cell
    title = model_id
    if md_cells:
        first_line = md_cells[0].strip().split("\n")[0]
        first_line = re.sub(r"^#+\s*", "", first_line).strip()
        if first_line:
            title = first_line

    # Determine category from filepath
    dir_name = os.path.basename(os.path.dirname(filepath))

    # ------- Check for various model types -------

    has_module_list = "nn.ModuleList" in all_code
    has_actor_critic = ("Actor" in all_code and "Critic" in all_code) or "ActorCritic" in all_code
    has_transformer = "TransformerEncoder" in all_code
    has_lgb = "lgb.train" in all_code or "lgb.Dataset" in all_code or "lightgbm" in all_code.lower()
    has_xgb = "xgb.train" in all_code or "xgb.DMatrix" in all_code or "xgboost" in all_code.lower()
    has_rf = "RandomForest" in all_code
    has_svc = "SVC(" in all_code or "SVM" in all_code.upper()
    has_lasso = "Lasso(" in all_code
    has_ridge = "Ridge(" in all_code
    has_elastic = "ElasticNet(" in all_code
    has_linear_reg = "LinearRegression(" in all_code
    has_nn_module = "nn.Module" in all_code
    has_lstm = "nn.LSTM(" in all_code
    has_gru = "nn.GRU(" in all_code
    has_conv = "nn.Conv1d(" in all_code

    # Extract all nn.Module class blocks
    class_blocks = extract_class_blocks(all_code)

    result = {"modelId": model_id, "title": title}

    # ===== BRANCHING ARCHITECTURES (nn.ModuleList or multiple branch classes) =====
    if has_module_list and has_nn_module and not has_actor_critic:
        result["archType"] = "branching"
        branches = []
        shared_layers = []

        # Find the main model class (usually the last or largest)
        main_class = None
        for cls_name, init_code in class_blocks.items():
            if "ModuleList" in init_code or "branches" in init_code or "merge" in init_code.lower():
                main_class = cls_name
                main_init = init_code

        # Find branch class
        branch_class = None
        for cls_name, init_code in class_blocks.items():
            if cls_name != main_class and "nn.Module" not in init_code:
                pass
            if cls_name != main_class:
                branch_layers = parse_init_method(init_code)
                if branch_layers:
                    branch_class = cls_name
                    # Detect how many branches from ModuleList
                    n_branches_match = re.search(r"range\((\d+)\)", main_init) if main_class else None
                    n_branches = int(n_branches_match.group(1)) if n_branches_match else 4
                    for i in range(min(n_branches, 4)):
                        branches.append({"name": f"Branch {i+1} ({cls_name})", "layers": branch_layers})

        # Parse main class for merger layers
        if main_class:
            main_layers = parse_init_method(main_init)
            # Layers in main that are not in branches are shared/merger
            merger_layer = None
            for layer in main_layers:
                if layer["type"] == "Linear" and "merge" in main_init.lower():
                    merger_layer = layer
                    break

            # Check for merge Sequential
            merge_match = re.search(r"self\.merge\s*=\s*nn\.Sequential\(", main_init)
            if merge_match:
                merge_section = main_init[merge_match.start():]
                merge_end = merge_section.find("\n    )")
                if merge_end > 0:
                    merge_code = merge_section[:merge_end + 5]
                    merge_layers = parse_init_method(merge_code)
                    if merge_layers:
                        shared_layers = merge_layers

            if merger_layer:
                result["merger"] = merger_layer

        if branches:
            result["branches"] = branches
        if shared_layers:
            result["shared"] = shared_layers

        return result

    # ===== MULTI-HEAD (Actor-Critic RL architectures) =====
    if has_actor_critic:
        result["archType"] = "multi-head"
        heads = []
        shared = []

        for cls_name, init_code in class_blocks.items():
            layers = parse_init_method(init_code)
            if not layers:
                continue

            # Check if this class has both actor and critic
            if "actor" in init_code.lower() and "critic" in init_code.lower():
                # Shared + heads architecture
                for layer in layers:
                    lt = layer["type"]
                    if lt in ("Linear", "Conv1d") and "shared" in init_code[:init_code.find(lt)].lower():
                        shared.append(layer)
                    elif "actor" in str(layer.get("label", "")).lower():
                        heads.append({"name": "Actor", "layers": [layer]})
                    elif "critic" in str(layer.get("label", "")).lower():
                        heads.append({"name": "Critic", "layers": [layer]})

                if not shared and not heads:
                    # Fallback: parse by variable names
                    actor_layers = []
                    critic_layers = []
                    shared_layers = []
                    in_section = None
                    for line in init_code.split("\n"):
                        if "self.shared" in line or "self.common" in line:
                            in_section = "shared"
                        elif "self.actor" in line:
                            in_section = "actor"
                        elif "self.critic" in line:
                            in_section = "critic"

                    # Simple approach: first layers shared, then split
                    half = len(layers) // 2
                    if half > 0:
                        shared = layers[:max(1, half - 1)]
                        heads = [
                            {"name": "Actor (Policy)", "layers": layers[half-1:half+1]},
                            {"name": "Critic (Value)", "layers": layers[half+1:]},
                        ]

            elif "actor" in cls_name.lower() or "policy" in cls_name.lower():
                heads.append({"name": f"Actor ({cls_name})", "layers": layers})
            elif "critic" in cls_name.lower() or "value" in cls_name.lower():
                heads.append({"name": f"Critic ({cls_name})", "layers": layers})

        # If we have Q-Network + A2C + PPO (ensemble RL)
        if not heads:
            for cls_name, init_code in class_blocks.items():
                layers = parse_init_method(init_code)
                if layers:
                    heads.append({"name": cls_name, "layers": layers})

        if shared:
            result["shared"] = shared
        if heads:
            result["heads"] = heads[:4]  # Limit to 4 heads
        else:
            # Fallback
            result["heads"] = [{"name": "Policy Network", "layers": [
                {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
            ]}]

        return result

    # ===== TRANSFORMER =====
    if has_transformer and has_nn_module:
        result["archType"] = "transformer"

        # Find the main transformer model class
        all_layers = []
        for cls_name, init_code in class_blocks.items():
            if "TransformerEncoder" in init_code:
                all_layers = parse_init_method(init_code)
                break

        if all_layers:
            result["layers"] = all_layers
        else:
            result["layers"] = [
                {"type": "Linear", "label": "InputProjection", "params": {}},
                {"type": "TransformerEncoder", "label": "TransformerEncoder", "params": {}},
                {"type": "Linear", "label": "FC Output", "params": {}},
                {"type": "Sigmoid", "label": "Sigmoid"},
            ]
        return result

    # ===== SEQUENTIAL DL MODELS (LSTM, GRU, CNN, FCNN) =====
    if has_nn_module and (has_lstm or has_gru or has_conv or "nn.Linear" in all_code):
        result["archType"] = "sequential"

        # Find the primary model class
        best_class = None
        best_layers = []
        for cls_name, init_code in class_blocks.items():
            # Skip helper classes like PositionalEncoding, Attention, QNetwork...
            if cls_name in ("PositionalEncoding", "TradingEnv", "PairwiseDataset"):
                continue
            layers = parse_init_method(init_code)
            if len(layers) > len(best_layers):
                best_layers = layers
                best_class = cls_name

        if best_layers:
            result["layers"] = best_layers
        else:
            # Fallback
            result["layers"] = [
                {"type": "Linear", "label": "FC (input)", "params": {}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC (output)", "params": {}},
            ]
        return result

    # ===== TREE ENSEMBLE (LightGBM / XGBoost / Random Forest) =====
    if has_lgb:
        result["archType"] = "tree-ensemble"
        result["algorithm"] = "LightGBM"
        params = extract_lgb_params(all_code)
        if params:
            result["params"] = params
        else:
            result["params"] = {"boosting_type": "gbdt", "num_leaves": 31, "learning_rate": 0.05}
        return result

    if has_xgb:
        result["archType"] = "tree-ensemble"
        result["algorithm"] = "XGBoost"
        params = extract_xgb_params(all_code)
        if params:
            result["params"] = params
        else:
            result["params"] = {"max_depth": 6, "learning_rate": 0.1, "n_estimators": 200}
        return result

    if has_rf:
        result["archType"] = "tree-ensemble"
        result["algorithm"] = "RandomForest"
        params = {}
        m = re.search(r"RandomForest\w*\(([^)]+)\)", all_code)
        if m:
            for pair in re.finditer(r"(\w+)\s*=\s*([\w.]+)", m.group(1)):
                key, val = pair.group(1), pair.group(2)
                if key in ("random_state", "n_jobs", "verbose"):
                    continue
                try:
                    if "." in val:
                        params[key] = float(val)
                    else:
                        params[key] = int(val)
                except ValueError:
                    params[key] = val
        result["params"] = params if params else {"n_estimators": 200, "max_depth": 8}
        return result

    # ===== KERNEL METHOD (SVM) =====
    if has_svc:
        result["archType"] = "kernel-method"
        result["algorithm"] = "SVM (RBF)"
        params = {}
        m = re.search(r"SVC\(([^)]+)\)", all_code)
        if m:
            for pair in re.finditer(r"(\w+)\s*=\s*(['\"]?\w+\.?\w*['\"]?)", m.group(1)):
                key, val = pair.group(1), pair.group(2).strip("'\"")
                if key in ("random_state", "probability"):
                    continue
                try:
                    if "." in val:
                        params[key] = float(val)
                    else:
                        params[key] = int(val)
                except ValueError:
                    # Skip non-literal values (e.g. cfg['C'])
                    if key == "kernel":
                        params[key] = val
        # Always provide sensible defaults
        if "kernel" not in params:
            params["kernel"] = "rbf"
        if "C" not in params:
            params["C"] = 1.0
        if "gamma" not in params:
            params["gamma"] = 0.1
        result["params"] = params
        return result

    # ===== LINEAR REGULARIZED =====
    if has_lasso or has_ridge or has_elastic:
        result["archType"] = "linear-regularized"
        if has_elastic:
            result["algorithm"] = "ElasticNet"
            result["params"] = {"alpha": 0.01, "l1_ratio": 0.5}
        elif has_lasso and has_ridge:
            result["algorithm"] = "Lasso + Ridge + ElasticNet"
            result["params"] = {"lasso_alpha": 0.01, "ridge_alpha": 1.0}
        elif has_lasso:
            result["algorithm"] = "Lasso"
            result["params"] = {"alpha": 0.01}
        else:
            result["algorithm"] = "Ridge"
            result["params"] = {"alpha": 1.0}

        if has_linear_reg:
            result["algorithm"] = "OLS + Ridge + Lasso + ElasticNet"
        return result

    if has_linear_reg:
        result["archType"] = "linear-regularized"
        result["algorithm"] = "LinearRegression"
        result["params"] = {}
        return result

    # ===== STATISTICAL =====
    # Default for stat arb, portfolio opt, and other non-ML
    result["archType"] = "statistical"

    # Detect specific algorithm from content
    if "kalman" in all_code.lower() or "coint" in all_code.lower():
        result["algorithm"] = "Cointegration + Kalman Filter"
        result["params"] = {"entry_z": 2.0, "exit_z": 0.5}
    elif "ecm" in model_id or "error_correction" in all_code.lower():
        result["algorithm"] = "Error Correction Model"
        result["params"] = {"lookback": 60}
    elif "black_litterman" in all_code.lower() or "bl_" in model_id or "bl-" in model_id:
        result["algorithm"] = "Black-Litterman + Ledoit-Wolf"
        result["params"] = {"tau": 0.05, "risk_aversion": 2.5}
    elif "cvar" in all_code.lower() or "CVaR" in all_code:
        result["algorithm"] = "Actor-Critic CVaR Optimization"
        result["params"] = {"alpha": 0.05}
    elif "monte_carlo" in model_id or "monte-carlo" in model_id:
        result["algorithm"] = "Monte Carlo + K-Means Clustering"
        result["params"] = {"n_simulations": 10000}
    elif "higher_moments" in model_id or "higher-moments" in model_id:
        result["algorithm"] = "Higher-Moment Portfolio Optimization"
        result["params"] = {"skewness_weight": 0.5, "kurtosis_weight": 0.5}
    elif "scoring" in model_id or "screening" in model_id:
        result["algorithm"] = "Multi-Factor Scoring & Screening"
        result["params"] = {}
    elif "mv_ml" in model_id or "mv-ml" in model_id:
        result["algorithm"] = "Mean-Variance with ML Predictions"
        result["params"] = {}
    elif "bollinger" in model_id:
        result["algorithm"] = "Improved Bollinger Bands"
        result["params"] = {"window": 20, "num_std": 2}
    elif "fama" in model_id or "macbeth" in model_id:
        result["algorithm"] = "Fama-MacBeth Two-Pass Regression"
        result["params"] = {"window": 60}
    elif "kpca" in model_id:
        result["algorithm"] = "Kernel PCA + Regression"
        result["params"] = {"n_components": 5, "kernel": "rbf"}
    elif "autoalpha" in model_id:
        result["algorithm"] = "Genetic Programming Alpha Mining"
        result["params"] = {"population": 500, "generations": 50}
    elif "warm-gp" in model_id or "warm_gp" in model_id:
        result["algorithm"] = "Warm-Start Genetic Programming"
        result["params"] = {"population": 300}
    elif "llm-alpha" in model_id or "llm_alpha" in model_id:
        result["algorithm"] = "LLM-Guided Alpha Generation"
        result["params"] = {}
    elif "lever" in model_id:
        result["algorithm"] = "LEVER Online Learning"
        result["params"] = {}
    elif "hft-infra" in model_id or "hft_infra" in model_id:
        result["algorithm"] = "HFT Infrastructure Framework"
        result["params"] = {}

    return result


# --------------------------------------------------------------------------
# Special overrides for notebooks with complex architectures
# --------------------------------------------------------------------------

def apply_overrides(model_id, arch):
    """Apply manual corrections for notebooks where regex parsing is insufficient."""

    # RL ensemble: PPO + A2C + DQN
    if model_id == "ppo-a2c-sac-ensemble-li2022":
        arch["archType"] = "multi-head"
        arch["title"] = "Ensemble RL: PPO + A2C + DQN"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "DQN", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->3)", "params": {"in_features": 64, "out_features": 3}},
            ]},
            {"name": "A2C Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->3)", "params": {"in_features": 64, "out_features": 3}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
            {"name": "A2C Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
            {"name": "PPO Actor-Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->3+1)", "params": {"in_features": 64, "out_features": 4}},
            ]},
        ]
        arch["merger"] = {"type": "MajorityVote", "label": "Majority Vote Ensemble"}

    # Stacking ensemble
    elif model_id == "stacking-ensemble-zheng2024":
        arch["archType"] = "branching"
        arch["title"] = "Stacking Ensemble (RF + XGB + LGB + Meta)"
        arch["branches"] = [
            {"name": "RandomForest", "layers": [
                {"type": "RandomForest", "label": "RF(n=200)", "params": {"n_estimators": 200}},
            ]},
            {"name": "XGBoost", "layers": [
                {"type": "XGBoost", "label": "XGB(depth=6)", "params": {"max_depth": 6}},
            ]},
            {"name": "LightGBM", "layers": [
                {"type": "LightGBM", "label": "LGB(leaves=31)", "params": {"num_leaves": 31}},
            ]},
        ]
        arch["merger"] = {"type": "Linear", "label": "Meta-Learner (Ridge)", "params": {"alpha": 1.0}}

    # LambdaMART
    elif model_id == "lambdamart-zhang2021":
        arch["archType"] = "tree-ensemble"
        arch["algorithm"] = "LambdaMART"
        arch["params"] = {"n_estimators": 300, "num_leaves": 31, "learning_rate": 0.1}

    # ChatGPT NLP + LSTM
    elif model_id == "chatgpt-nlp-lstm-zhang2023":
        arch["archType"] = "sequential"
        arch["title"] = "ChatGPT Sentiment + LSTM"
        arch["layers"] = [
            {"type": "Embedding", "label": "Sentiment Score (GPT)", "params": {}},
            {"type": "LSTM", "label": "LSTM(input->64)", "params": {"input_size": "features", "hidden_size": 64, "num_layers": 1}},
            {"type": "Dropout", "label": "Dropout(0.2)", "params": {"p": 0.2}},
            {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            {"type": "Sigmoid", "label": "Sigmoid"},
        ]

    # EDPG-GRU-DDPG
    elif model_id == "edpg-gru-ddpg-zhu2022":
        arch["archType"] = "multi-head"
        arch["title"] = "EDPG: GRU Encoder + DDPG"
        arch["shared"] = [
            {"type": "GRU", "label": "GRU Encoder(state->64)", "params": {"input_size": "state_dim", "hidden_size": 64}},
        ]
        arch["heads"] = [
            {"name": "Actor (DDPG)", "layers": [
                {"type": "Linear", "label": "FC(64->32)", "params": {"in_features": 64, "out_features": 32}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(32->action)", "params": {"in_features": 32, "out_features": "action_dim"}},
                {"type": "Tanh", "label": "Tanh"},
            ]},
            {"name": "Critic (DDPG)", "layers": [
                {"type": "Linear", "label": "FC(64+action->32)", "params": {"in_features": "64+action", "out_features": 32}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(32->1)", "params": {"in_features": 32, "out_features": 1}},
            ]},
        ]

    # MTL-DDPG
    elif model_id == "mtl-ddpg-deng2023":
        arch["archType"] = "multi-head"
        arch["title"] = "Multi-Task Learning DDPG"
        arch["shared"] = [
            {"type": "Linear", "label": "SharedFC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "Trading Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
            ]},
            {"name": "Price Predictor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
            {"name": "Critic", "layers": [
                {"type": "Linear", "label": "FC(128+action->64)", "params": {}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # GARCH-PPO
    elif model_id == "garch-ppo-wang2021":
        arch["archType"] = "multi-head"
        arch["title"] = "GARCH-Enhanced PPO"
        arch["shared"] = [
            {"type": "GARCH", "label": "GARCH(1,1) Volatility", "params": {"p": 1, "q": 1}},
            {"type": "Linear", "label": "FC(state+vol->128)", "params": {"in_features": "state+1", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "PPO Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
            {"name": "PPO Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # PPO Futures
    elif model_id == "ppo-futures-chen2023":
        arch["archType"] = "multi-head"
        arch["title"] = "PPO for Futures Trading"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "PPO Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
            {"name": "PPO Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # MCTG
    elif model_id == "mctg-wang2021a":
        arch["archType"] = "multi-head"
        arch["title"] = "Monte Carlo Tree-Guided RL"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "MCTS Policy", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
            {"name": "Value Network", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # DRPO
    elif model_id == "drpo-han2023":
        arch["archType"] = "multi-head"
        arch["title"] = "Distributionally Robust Policy Optimization"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->256)", "params": {"in_features": "state_dim", "out_features": 256}},
            {"type": "ReLU", "label": "ReLU"},
            {"type": "Linear", "label": "FC(256->128)", "params": {"in_features": 256, "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "Robust Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
                {"type": "Tanh", "label": "Tanh"},
            ]},
            {"name": "Robust Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # Bandit TradeBot
    elif model_id == "bandit-tradebot-zhang2021":
        arch["archType"] = "statistical"
        arch["title"] = "Multi-Armed Bandit TradeBot"
        arch["algorithm"] = "Thompson Sampling + UCB"
        arch["params"] = {"n_arms": 3, "exploration": "UCB1"}

    # Inverse RL
    elif model_id == "inverse-rl-zhang2023":
        arch["archType"] = "multi-head"
        arch["title"] = "Inverse Reinforcement Learning"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "Reward Network (IRL)", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
            {"name": "Policy Network", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->action)", "params": {"in_features": 64, "out_features": "action_dim"}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
        ]

    # AutoAlpha
    elif model_id == "autoalpha-zhang2020":
        arch["archType"] = "statistical"

    # Warm GP
    elif model_id == "warm-gp-ren2024":
        arch["archType"] = "statistical"

    # SVM Pairs
    elif model_id == "svm-pairs-yu2022":
        arch["archType"] = "kernel-method"
        arch["algorithm"] = "SVM Pairs Trading"
        arch["params"] = {"kernel": "rbf", "C": 1.0}

    # ECM Pairs
    elif model_id == "ecm-pairs-wang2023":
        arch["archType"] = "statistical"
        arch["algorithm"] = "Error Correction Model (ECM)"
        arch["params"] = {"lookback": 60, "entry_z": 2.0, "exit_z": 0.5}

    # LSTM Arbitrage
    elif model_id == "lstm-arbitrage-han2024":
        arch["archType"] = "sequential"
        arch["title"] = "LSTM Statistical Arbitrage"
        arch["layers"] = [
            {"type": "LSTM", "label": "LSTM(features->64)", "params": {"input_size": "features", "hidden_size": 64, "num_layers": 2}},
            {"type": "Dropout", "label": "Dropout(0.2)", "params": {"p": 0.2}},
            {"type": "Linear", "label": "FC(64->32)", "params": {"in_features": 64, "out_features": 32}},
            {"type": "ReLU", "label": "ReLU"},
            {"type": "Linear", "label": "FC(32->1)", "params": {"in_features": 32, "out_features": 1}},
            {"type": "Tanh", "label": "Tanh"},
        ]

    # RL HFT tuning
    elif model_id == "rl-hft-tuning-zhang2023":
        arch["archType"] = "multi-head"
        arch["title"] = "RL-Based HFT Parameter Tuning"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->128)", "params": {"in_features": "state_dim", "out_features": 128}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "Parameter Actor", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->params)", "params": {"in_features": 64, "out_features": "n_params"}},
                {"type": "Sigmoid", "label": "Sigmoid"},
            ]},
            {"name": "PnL Critic", "layers": [
                {"type": "Linear", "label": "FC(128->64)", "params": {"in_features": 128, "out_features": 64}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(64->1)", "params": {"in_features": 64, "out_features": 1}},
            ]},
        ]

    # LEVER
    elif model_id == "lever-yuan2024":
        arch["archType"] = "statistical"
        arch["algorithm"] = "LEVER Online Learning"
        arch["params"] = {}

    # HFT Infra
    elif model_id == "hft-infra-chen2024":
        arch["archType"] = "statistical"
        arch["algorithm"] = "HFT Infrastructure (Low-Latency)"
        arch["params"] = {}

    # AC CVaR
    elif model_id == "ac-cvar-ju2022":
        arch["archType"] = "multi-head"
        arch["title"] = "Actor-Critic CVaR Portfolio"
        arch["shared"] = [
            {"type": "Linear", "label": "FC(state->64)", "params": {}},
            {"type": "ReLU", "label": "ReLU"},
        ]
        arch["heads"] = [
            {"name": "Actor (Weights)", "layers": [
                {"type": "Linear", "label": "FC(64->32)", "params": {}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(32->n_assets)", "params": {}},
                {"type": "Softmax", "label": "Softmax"},
            ]},
            {"name": "Critic (CVaR)", "layers": [
                {"type": "Linear", "label": "FC(64->32)", "params": {}},
                {"type": "ReLU", "label": "ReLU"},
                {"type": "Linear", "label": "FC(32->1)", "params": {}},
            ]},
        ]

    # MFTR - Multi-Frequency Timing Residual Network
    elif model_id == "mftr-guo2023":
        arch["archType"] = "branching"
        arch["title"] = "MFTR: Multi-Frequency Timing Residual Network"
        arch["branches"] = [
            {"name": "1D Branch (Daily)", "layers": [
                {"type": "LSTM", "label": "LSTM(features->32)", "params": {"input_size": "features", "hidden_size": 32}},
                {"type": "LayerNorm", "label": "LayerNorm(32)", "params": {"normalized_shape": 32}},
            ]},
            {"name": "5D Branch (Weekly)", "layers": [
                {"type": "LSTM", "label": "LSTM(features->32)", "params": {"input_size": "features", "hidden_size": 32}},
                {"type": "LayerNorm", "label": "LayerNorm(32)", "params": {"normalized_shape": 32}},
            ]},
            {"name": "20D Branch (Monthly)", "layers": [
                {"type": "LSTM", "label": "LSTM(features->32)", "params": {"input_size": "features", "hidden_size": 32}},
                {"type": "LayerNorm", "label": "LayerNorm(32)", "params": {"normalized_shape": 32}},
            ]},
        ]
        arch["shared"] = [
            {"type": "Linear", "label": "FC(96->64)", "params": {"in_features": 96, "out_features": 64}},
            {"type": "ReLU", "label": "ReLU"},
            {"type": "Dropout", "label": "Dropout(0.3)", "params": {"p": 0.3}},
            {"type": "Linear", "label": "FC(64->32)", "params": {"in_features": 64, "out_features": 32}},
            {"type": "ReLU", "label": "ReLU"},
            {"type": "Linear", "label": "FC(32->1)", "params": {"in_features": 32, "out_features": 1}},
            {"type": "Sigmoid", "label": "Sigmoid"},
        ]
        arch["merger"] = {"type": "ResidualConnection", "label": "Residual: 20D->5D->1D"}

    # Diff LSTM EMD
    elif model_id == "diff-lstm-emd-chen2024":
        arch["archType"] = "branching"
        arch["title"] = "EMD + Differential LSTM"

    # KPCA
    elif model_id == "kpca-regression-zhou2020":
        arch["archType"] = "statistical"
        arch["algorithm"] = "Kernel PCA + Regression"
        arch["params"] = {"n_components": 5, "kernel": "rbf"}

    return arch


# --------------------------------------------------------------------------
# TypeScript code generation
# --------------------------------------------------------------------------

def sanitize_value(val):
    """Convert a Python value to a TypeScript literal string."""
    if isinstance(val, bool):
        return "true" if val else "false"
    elif isinstance(val, (int, float)):
        return str(val)
    elif isinstance(val, str):
        return f"'{val}'"
    else:
        return f"'{val}'"


def render_params(params, indent=6):
    """Render a params dict as TypeScript object literal."""
    if not params:
        return ""
    pad = " " * indent
    lines = []
    for k, v in params.items():
        lines.append(f"{pad}{k}: {sanitize_value(v)},")
    return "\n".join(lines)


def render_layer(layer, indent=8):
    """Render a single ArchLayer as TypeScript."""
    pad = " " * indent
    parts = [f"{pad}{{ type: '{layer['type']}', label: '{layer['label']}'"]
    params = layer.get("params")
    if params:
        params_str = ", ".join(f"{k}: {sanitize_value(v)}" for k, v in params.items())
        parts[0] += f", params: {{ {params_str} }}"
    parts[0] += " },"
    return parts[0]


def render_layers(layers, indent=8):
    """Render array of ArchLayer."""
    return "\n".join(render_layer(l, indent) for l in layers)


def render_branch(branch, indent=8):
    """Render a single ArchBranch."""
    pad = " " * indent
    lines = [f"{pad}{{"]
    lines.append(f"{pad}  name: '{branch['name']}',")
    lines.append(f"{pad}  layers: [")
    for layer in branch["layers"]:
        lines.append(render_layer(layer, indent + 4))
    lines.append(f"{pad}  ],")
    lines.append(f"{pad}}},")
    return "\n".join(lines)


def render_architecture(arch):
    """Render a single ModelArchitecture entry."""
    mid = arch["modelId"]
    lines = []
    lines.append(f"  '{mid}': {{")
    lines.append(f"    modelId: '{mid}',")
    lines.append(f"    archType: '{arch['archType']}',")

    # Escape single quotes in title
    title = arch.get("title", mid).replace("'", "\\'")
    lines.append(f"    title: '{title}',")

    # Sequential / transformer: layers
    if "layers" in arch:
        lines.append("    layers: [")
        for layer in arch["layers"]:
            lines.append(render_layer(layer, 6))
        lines.append("    ],")

    # Branching: branches
    if "branches" in arch:
        lines.append("    branches: [")
        for branch in arch["branches"]:
            lines.append(render_branch(branch, 6))
        lines.append("    ],")

    # Multi-head: shared + heads
    if "shared" in arch:
        lines.append("    shared: [")
        for layer in arch["shared"]:
            lines.append(render_layer(layer, 6))
        lines.append("    ],")

    if "heads" in arch:
        lines.append("    heads: [")
        for head in arch["heads"]:
            lines.append(render_branch(head, 6))
        lines.append("    ],")

    # Merger
    if "merger" in arch:
        m = arch["merger"]
        params_part = ""
        if m.get("params"):
            params_str = ", ".join(f"{k}: {sanitize_value(v)}" for k, v in m["params"].items())
            params_part = f", params: {{ {params_str} }}"
        lines.append(f"    merger: {{ type: '{m['type']}', label: '{m['label']}'{params_part} }},")

    # Algorithm (tree-ensemble, kernel-method, etc.)
    if "algorithm" in arch:
        alg = arch["algorithm"].replace("'", "\\'")
        lines.append(f"    algorithm: '{alg}',")

    # Params (for non-DL models)
    if "params" in arch and arch["archType"] not in ("sequential", "transformer"):
        lines.append("    params: {")
        for k, v in arch["params"].items():
            lines.append(f"      {k}: {sanitize_value(v)},")
        lines.append("    },")

    lines.append("  },")
    return "\n".join(lines)


def generate_typescript(architectures):
    """Generate the full TypeScript file content."""
    lines = []
    lines.append("// Auto-generated by web/extract_model_arch.py")
    lines.append("// Do not edit manually")
    lines.append("")
    lines.append("export interface ArchLayer {")
    lines.append("  type: string;")
    lines.append("  label: string;")
    lines.append("  params?: Record<string, number | string | boolean>;")
    lines.append("}")
    lines.append("")
    lines.append("export interface ArchBranch {")
    lines.append("  name: string;")
    lines.append("  layers: ArchLayer[];")
    lines.append("}")
    lines.append("")
    lines.append("export interface ModelArchitecture {")
    lines.append("  modelId: string;")
    lines.append("  archType: 'sequential' | 'branching' | 'multi-head' | 'transformer' | 'tree-ensemble' | 'kernel-method' | 'linear-regularized' | 'statistical';")
    lines.append("  title: string;")
    lines.append("  layers?: ArchLayer[];")
    lines.append("  branches?: ArchBranch[];")
    lines.append("  shared?: ArchLayer[];")
    lines.append("  heads?: ArchBranch[];")
    lines.append("  merger?: ArchLayer;")
    lines.append("  algorithm?: string;")
    lines.append("  params?: Record<string, number | string>;")
    lines.append("}")
    lines.append("")
    lines.append("export const MODEL_ARCHITECTURES: Record<string, ModelArchitecture> = {")

    for arch in architectures:
        lines.append(render_architecture(arch))

    lines.append("};")
    lines.append("")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Model Architecture Extraction")
    print("=" * 60)

    notebooks = find_notebooks()
    print(f"\nFound {len(notebooks)} notebooks\n")

    architectures = []
    stats = {}

    for nb_path in notebooks:
        model_id = notebook_to_model_id(nb_path)
        rel_path = os.path.relpath(nb_path, BASE_DIR)
        print(f"Processing: {rel_path} -> {model_id}")

        arch = extract_architecture(nb_path)
        arch = apply_overrides(model_id, arch)

        arch_type = arch.get("archType", "unknown")
        stats[arch_type] = stats.get(arch_type, 0) + 1

        # Summary
        if arch_type in ("sequential", "transformer"):
            n_layers = len(arch.get("layers", []))
            print(f"  -> {arch_type} ({n_layers} layers)")
        elif arch_type == "branching":
            n_branches = len(arch.get("branches", []))
            print(f"  -> {arch_type} ({n_branches} branches)")
        elif arch_type == "multi-head":
            n_heads = len(arch.get("heads", []))
            print(f"  -> {arch_type} ({n_heads} heads)")
        elif arch_type in ("tree-ensemble", "kernel-method", "linear-regularized", "statistical"):
            alg = arch.get("algorithm", "N/A")
            print(f"  -> {arch_type} ({alg})")
        else:
            print(f"  -> {arch_type}")

        architectures.append(arch)

    # Generate TypeScript
    ts_content = generate_typescript(architectures)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print(f"\n{'=' * 60}")
    print(f"Output written to: {OUTPUT_PATH}")
    print(f"Total models: {len(architectures)}")
    print(f"\nArchitecture type statistics:")
    for arch_type, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {arch_type:25s}: {count}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
