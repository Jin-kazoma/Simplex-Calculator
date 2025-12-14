function $(id) {
    return document.getElementById(id);
}

let buildBtn = $('build');
let solveBtn = $('solve');
let resetBtn = $('reset');
let inputsArea = $('inputsArea');
let resultArea = $('resultArea');
let optType = $('optType');

/* =========================
   VARIABLE NAMES
========================= */
function generateVarNames(n) {
    const vars = [];
    for (let i = 1; i <= n; i++) {
        vars.push(i === 1 ? "x" : `x<sup>${i}</sup>`);
    }
    return vars;
}

/* =========================
   DECIMAL → FRACTION
========================= */
function toFraction(num) {
    if (!isFinite(num)) return "";
    if (Math.abs(num - Math.round(num)) < 1e-10)
        return String(Math.round(num));

    let tolerance = 1e-10;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = num;

    do {
        let a = Math.floor(b);
        let h = a * h1 + h2;
        let k = a * k1 + k2;

        h2 = h1; h1 = h;
        k2 = k1; k1 = k;
        b = 1 / (b - a);
    } while (Math.abs(num - h1 / k1) > tolerance);

    return h1 + "/" + k1;
}

/* =========================
   BUTTON EVENTS
========================= */
buildBtn.onclick = buildInputs;
solveBtn.onclick = solveSimplex;
resetBtn.onclick = () => {
    inputsArea.innerHTML = "";
    resultArea.innerHTML = "";
};

/* =========================
   BUILD INPUTS
========================= */
function buildInputs() {
    const n = parseInt($("numVars").value);
    const m = parseInt($("numCons").value);
    const varNames = generateVarNames(n);

    let html = "<h3>Objective Function</h3>";
    html += (optType.value === "max" ? "Maximize: " : "Minimize: ");

    for (let j = 0; j < n; j++) {
        html += `<input id="c${j}" type="number"> ${varNames[j]}`;
        if (j < n - 1) html += " + ";
    }

    html += "<h3>Constraints (≤)</h3>";
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            html += `<input id="a_${i}_${j}" type="number"> ${varNames[j]}`;
            if (j < n - 1) html += " + ";
        }
        html += ` ≤ <input id="b_${i}" type="number"><br>`;
    }

    inputsArea.innerHTML = html;
}

/* =========================
   TABLEAU DISPLAY
========================= */
function createTableauHTML(T, basic, nVars) {
    const varNames = generateVarNames(nVars);
    const rows = T.length;
    const cols = T[0].length;
    const m = basic.length;

    function bvName(idx) {
        return idx < nVars ? varNames[idx] : `s${idx - nVars + 1}`;
    }

    let table = "<table border='1' cellpadding='5'><tr><th>BV</th>";

    for (let j = 0; j < nVars; j++) table += `<th>${varNames[j]}</th>`;
    for (let j = 0; j < m; j++) table += `<th>s${j + 1}</th>`;
    table += "<th>RHS</th></tr>";

    for (let i = 0; i < m; i++) {
        table += `<tr><td>${bvName(basic[i])}</td>`;
        for (let j = 0; j < cols; j++) {
            table += `<td>${toFraction(T[i][j])}</td>`;
        }
        table += "</tr>";
    }

    table += "<tr><td>Z</td>";
    for (let j = 0; j < cols; j++) {
        table += `<td>${toFraction(T[rows - 1][j])}</td>`;
    }
    table += "</tr></table><br>";

    return table;
}

/* =========================
   SIMPLEX SOLVER
========================= */
function solveSimplex() {
    resultArea.innerHTML = "";

    const n = parseInt($("numVars").value);
    const m = parseInt($("numCons").value);
    const varNames = generateVarNames(n);

    let c = [];
    for (let j = 0; j < n; j++)
        c.push(parseFloat($(`c${j}`).value || 0));

    if (optType.value === "min")
        c = c.map(v => -v);

    let A = Array.from({ length: m }, () => Array(n).fill(0));
    let b = [];

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++)
            A[i][j] = parseFloat($(`a_${i}_${j}`).value || 0);
        b[i] = parseFloat($(`b_${i}`).value || 0);
    }

    const rows = m + 1;
    const cols = n + m + 1;

    let T = Array.from({ length: rows }, () => Array(cols).fill(0));
    let basic = [];

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++)
            T[i][j] = A[i][j];
        T[i][n + i] = 1;
        T[i][cols - 1] = b[i];
        basic.push(n + i);
    }

    for (let j = 0; j < n; j++)
        T[rows - 1][j] = -c[j];

    let tableauNum = 1;

    while (true) {
        resultArea.innerHTML += `<h4>Tableau ${tableauNum}</h4>`;
        resultArea.innerHTML += createTableauHTML(T, basic, n);

        let pivotCol = -1;
        let minVal = 0;

        for (let j = 0; j < cols - 1; j++) {
            if (T[rows - 1][j] < minVal) {
                minVal = T[rows - 1][j];
                pivotCol = j;
            }
        }

        if (pivotCol === -1) break;

        let pivotRow = -1;
        let best = Infinity;

        for (let i = 0; i < m; i++) {
            if (T[i][pivotCol] > 0) {
                let r = T[i][cols - 1] / T[i][pivotCol];
                if (r < best) {
                    best = r;
                    pivotRow = i;
                }
            }
        }

        resultArea.innerHTML += "<b>Step 4: Pivotal Elimination</b><br><br>";

        let pivot = T[pivotRow][pivotCol];
        resultArea.innerHTML += `Pivot = ${toFraction(pivot)}<br>`;
        resultArea.innerHTML += `1 / Pivot = ${toFraction(1 / pivot)}<br><br>`;

        for (let j = 0; j < cols; j++)
            T[pivotRow][j] /= pivot;

        for (let i = 0; i < rows; i++) {
            if (i !== pivotRow) {
                let f = T[i][pivotCol];
                for (let j = 0; j < cols; j++)
                    T[i][j] -= f * T[pivotRow][j];
            }
        }

        basic[pivotRow] = pivotCol;
        tableauNum++;
    }

    let sol = Array(n).fill(0);
    for (let i = 0; i < m; i++) {
        if (basic[i] < n)
            sol[basic[i]] = T[i][cols - 1];
    }

    let Z = T[rows - 1][cols - 1];
    if (optType.value === "min") Z = -Z;

    resultArea.innerHTML += "<h3>Final Answer</h3>";
    for (let j = 0; j < n; j++)
        resultArea.innerHTML += `${varNames[j]} = ${toFraction(sol[j])}<br>`;
    resultArea.innerHTML += `<b>Z = ${toFraction(Z)}</b>`;
                       }
        
