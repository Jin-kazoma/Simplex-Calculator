// Helper functions
function $(id) {
    return document.getElementById(id);
}

function generateVarNames(n) {
    const vars = [];
    for (let i = 1; i <= n; i++) {
        vars.push(i === 1 ? "x" : `x<sup>${i}</sup>`);
    }
    return vars;
}

// Convert decimal to fraction
function toFraction(num) {
    if (Math.abs(num - Math.round(num)) < 1e-10) return String(Math.round(num));

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

// Step-by-step pivot calculation
function showPivotStepDynamic(T, pivotRow, pivotCol, basic, nVars) {
    const rows = T.length;
    const cols = T[0].length;
    const varNames = generateVarNames(nVars);

    let pivot = T[pivotRow][pivotCol];
    let pivotBV = basic[pivotRow];
    let enteringVarName = pivotCol < nVars ? varNames[pivotCol] : `s${pivotCol - nVars + 1}`;
    let leavingVarName = pivotBV < nVars ? varNames[pivotBV] : `s${pivotBV - nVars + 1}`;

    resultArea.innerHTML += `<b>Pivot Step: ${leavingVarName} → ${enteringVarName}</b><br>`;
    resultArea.innerHTML += `Pivot element (k) = ${toFraction(pivot)}<br>`;
    resultArea.innerHTML += `1/k = ${toFraction(1 / pivot)}<br><br>`;

    // Update pivot row
    resultArea.innerHTML += `<b>Update Pivot Row (${leavingVarName} → ${enteringVarName}):</b><br>`;
    for (let j = 0; j < cols; j++) {
        let oldVal = T[pivotRow][j];
        let val = oldVal / pivot;
        T[pivotRow][j] = val;
        let colName = j < nVars ? varNames[j] : `s${j - nVars + 1}`;
        if (j === cols - 1) colName = "RHS";
        resultArea.innerHTML += `${colName}: ${toFraction(oldVal)} * (1/${toFraction(pivot)}) = ${toFraction(val)}<br>`;
    }
    resultArea.innerHTML += "<br>";

    // Update other rows
    resultArea.innerHTML += `<b>Update Other Rows:</b><br>`;
    for (let i = 0; i < rows; i++) {
        if (i !== pivotRow) {
            let multiplier = T[i][pivotCol];
            resultArea.innerHTML += `<b>Row ${i + 1}:</b><br>`;
            for (let j = 0; j < cols; j++) {
                let oldVal = T[i][j];
                T[i][j] = oldVal - multiplier * T[pivotRow][j];
                let colName = j < nVars ? varNames[j] : `s${j - nVars + 1}`;
                if (j === cols - 1) colName = "RHS";
                resultArea.innerHTML += `${colName}: ${toFraction(oldVal)} - ${toFraction(multiplier)} * ${toFraction(T[pivotRow][j])} = ${toFraction(T[i][j])}<br>`;
            }
            resultArea.innerHTML += "<br>";
        }
    }

    // Update basic variable
    basic[pivotRow] = pivotCol;
}

// Create tableau HTML
function createTableauHTML(T, basic, nVars, pivotCol, pivotRow, enteringVar, leavingVar) {
    const varNames = generateVarNames(nVars);
    const m = basic.length;
    const rows = T.length;
    const cols = T[0].length;

    function bvName(idx) { return idx < nVars ? varNames[idx] : `s${idx - nVars + 1}`; }
    function toDecimal(num) { if (!isFinite(num)) return ""; if (Math.abs(num - Math.round(num)) < 1e-10) return String(Math.round(num)); return num.toFixed(6).replace(/\.?0+$/, ''); }

    let table = "<table border='1' cellpadding='4'>";
    table += "<tr><th>BV</th>";
    for (let j = 0; j < nVars; j++) table += `<th>${varNames[j]}</th>`;
    for (let j = 0; j < m; j++) table += `<th>s${j + 1}</th>`;
    table += "<th>RHS</th><th>Ratio</th></tr>";

    for (let d = 0; d < m; d++) {
        let idx = d;
        let bv = bvName(basic[idx]);
        table += `<tr ${idx === pivotRow ? "style='background:#ffcccc'" : ""}>`;
        table += `<td>${bv}</td>`;
        for (let j = 0; j < cols; j++) {
            let classes = [];
            if (j === enteringVar) classes.push('entering-var');
            let classAttr = classes.length ? `class="${classes.join(' ')}"` : '';
            table += `<td ${classAttr}>${toFraction(T[idx][j])}</td>`;
        }
        let ratio = '';
        if (pivotCol !== null && T[idx][pivotCol] > 0) ratio = toDecimal(T[idx][cols - 1] / T[idx][pivotCol]);
        table += `<td>${ratio}</td></tr>`;
    }

    table += "<tr><td>Z</td>";
    for (let j = 0; j < cols; j++) table += `<td>${toFraction(T[rows - 1][j])}</td>`;
    table += "<td></td></tr>";
    table += "</table><br>";
    return table;
}

// Main Simplex solver with dynamic step-by-step output
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
    let b = Array(m).fill(0);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++)
            A[i][j] = parseFloat($(`a_${i}_${j}`).value || 0);
        b[i] = parseFloat($(`b_${i}`).value || 0);
    }

    const cols = n + m + 1;
    const rows = m + 1;

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
        let obj = T[rows - 1];
        let pivotCol = -1;
        let minVal = 0;
        for (let j = 0; j < cols - 1; j++) {
            if (obj[j] < minVal) {
                minVal = obj[j];
                pivotCol = j;
            }
        }

        if (pivotCol === -1) {
            resultArea.innerHTML += `<h4>Tableau ${tableauNum} (Optimal)</h4>`;
            resultArea.innerHTML += createTableauHTML(T, basic, n, null, null, null, null);
            break;
        }

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

        if (pivotRow === -1) {
            alert("Unbounded solution!");
            return;
        }

        // Step-by-step pivot calculations
        showPivotStepDynamic(T, pivotRow, pivotCol, basic, n);

        // Display updated tableau
        resultArea.innerHTML += `<h4>Tableau ${tableauNum}</h4>`;
        resultArea.innerHTML += createTableauHTML(T, basic, n, pivotCol, pivotRow, pivotCol, basic[pivotRow]);

        tableauNum++;
    }

    // Extract solution
    let sol = Array(n).fill(0);
    for (let i = 0; i < m; i++) {
        if (basic[i] < n)
            sol[basic[i]] = T[i][cols - 1];
    }

    let Z = T[rows - 1][cols - 1];
    if (optType.value === "min") Z = -Z;

    resultArea.innerHTML += "<h3>Final Answer:</h3>";
    for (let j = 0; j < n; j++) {
        resultArea.innerHTML += `${varNames[j]} = ${toFraction(sol[j])}<br>`;
    }
    resultArea.innerHTML += `<b>Z = ${toFraction(Z)}</b>`;
}
    
