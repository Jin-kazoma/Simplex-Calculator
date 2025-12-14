function $(id)
{
    return document.getElementById(id);
}

let buildBtn = $('build');
let solveBtn = $('solve');
let resetBtn = $('reset');
let inputsArea = $('inputsArea');
let resultArea = $('resultArea');
let optType = $('optType');

//const varNames = ["x", "y", "z", "w", "v", "u"];
function generateVarNames(n)
{
    const vars = [];
    for(let i = 1; i <= n; i++){
        vars.push(i === 1 ? "x" : `x<sup>${i}</sup>`);
    }
    return vars;
}




  //DECIMAL → FRACTION

function toFraction(num){
    if(Math.abs(num - Math.round(num)) < 1e-10)
        return String(Math.round(num));

    let tolerance = 1e-10;
    let h1=1, h2=0, k1=0, k2=1;
    let b = num;

    do {
        let a = Math.floor(b);
        let h = a*h1 + h2;
        let k = a*k1 + k2;

        h2 = h1; h1 = h;
        k2 = k1; k1 = k;
        b = 1/(b-a);

    } while(Math.abs(num - h1/k1) > tolerance);

    return h1 + "/" + k1;
}


  //BUTTON EVENTS

buildBtn.onclick = buildInputs;
solveBtn.onclick = solveSimplex;
resetBtn.onclick = () => {
    inputsArea.innerHTML="";
    resultArea.innerHTML="";
};


  //BUILD INPUT FORM

function buildInputs(){
    const n = parseInt($("numVars").value);
    const m = parseInt($("numCons").value);

    const varNames = generateVarNames(n);

    let html = "<h3>Objective Function</h3>";
    html += (optType.value === "max" ? "Maximize: " : "Minimize: ");

    for(let j=0;j<n;j++){
        html += `<input id="c${j}" type="number" step="any"> ${varNames[j]}`;
        if(j<n-1) html += " + ";
    }

    html += "<h3>Constraints (≤)</h3>";
    for(let i=0;i<m;i++){
        for(let j=0;j<n;j++){
            html += `<input id="a_${i}_${j}" type="number" step="any"> ${varNames[j]}`;
            if(j<n-1) html += " + ";
        }
        html += ` ≤ <input id="b_${i}" type="number" step="any"><br>`;
    }

    inputsArea.innerHTML = html;
}


  //TABLEAU DISPLAY

function createTableauHTML(T, basic, nVars, pivotCol, pivotRow, enteringVar, leavingVar)
{
    const varNames = generateVarNames(nVars);
    // Render tableau rows in the exact order of the solver's `basic` array (no reordering)
    const m = basic.length;
    const rows = T.length;
    const cols = T[0].length;

    function bvName(idx){ return (idx < nVars) ? varNames[idx] : `s${idx - nVars + 1}`; }
    function toDecimal(num){ if(!isFinite(num)) return ""; if(Math.abs(num - Math.round(num)) < 1e-10) return String(Math.round(num)); return num.toFixed(6).replace(/\.?0+$/,''); }

    let table = "<table border='1' cellpadding='4'>";
    table += "<tr><th>BV</th>";
    for(let j=0;j<nVars;j++) table += `<th>${varNames[j]}</th>`;
    for(let j=0;j<m;j++) table += `<th>s${j+1}</th>`;
    table += "<th>RHS</th><th>Ratio</th></tr>";

    // preserve solver row order, but display originals (x,y,...) before slacks (s1,s2,...)
    // build a stable display order: keep the solver row sequence but move any rows whose
    // basic variable is a non-slack before those that are slacks, preserving row relative order.
    let originals = [];
    let slacks = [];
    for(let idx=0; idx<m; idx++){
        let b = basic[idx];
        if(typeof b === 'number' && b < nVars) originals.push(idx);
        else slacks.push(idx);
    }
    let displayOrder = originals.concat(slacks);
    for(let d=0; d<displayOrder.length; d++){
        let idx = displayOrder[d];
        let bv = bvName(basic[idx]);
        let bvClass = (leavingVar === basic[idx]) ? 'leaving-var' : '';
        table += `<tr ${idx===pivotRow ? "style='background:#ffcccc'" : ""}>`;
        table += `<td ${bvClass?`class="${bvClass}"`:''}>${bv}</td>`;

        for(let j=0;j<cols;j++){
            let classes = [];
            //if(idx===pivotRow && j===pivotCol) classes.push('pivot-cell');
            if(j===enteringVar) classes.push('entering-var');
            let classAttr = classes.length ? `class="${classes.join(' ')}"` : '';
            table += `<td ${classAttr}>${toFraction(T[idx][j])}</td>`;
        }

        let ratio = '';
        if(pivotCol !== null && T[idx][pivotCol] > 0){
            ratio = toDecimal(T[idx][cols-1] / T[idx][pivotCol]);
        }
        table += `<td>${ratio}</td></tr>`;
    }

    // Z row
    table += "<tr><td>Z</td>";
    for(let j=0;j<cols;j++) table += `<td>${toFraction(T[rows-1][j])}</td>`;
    table += "<td></td></tr>";
    table += "</table><br>";
    return table;
}


 // SIMPLEX SOLVER

function solveSimplex(){
    resultArea.innerHTML = "";

    const n = parseInt($("numVars").value);
    const m = parseInt($("numCons").value);

    const varNames = generateVarNames(n);

    let c = [];
    for(let j=0;j<n;j++)
        c.push(parseFloat($(`c${j}`).value || 0));

    if(optType.value === "min")
        c = c.map(v => -v);

    let A = Array.from({length:m},()=>Array(n).fill(0));
    let b = Array(m).fill(0);

    for(let i=0;i<m;i++){
        for(let j=0;j<n;j++)
            A[i][j] = parseFloat($(`a_${i}_${j}`).value || 0);
        b[i] = parseFloat($(`b_${i}`).value || 0);
    }

    const cols = n + m + 1;
    const rows = m + 1;

    let T = Array.from({length:rows},()=>Array(cols).fill(0));
    let basic = [];

    for(let i=0;i<m;i++){
        for(let j=0;j<n;j++)
            T[i][j] = A[i][j];

        T[i][n+i] = 1;
        T[i][cols-1] = b[i];
        basic.push(n+i);
    }

    for(let j=0;j<n;j++)
        T[rows-1][j] = -c[j];

    let tableauNum = 1;

    while(true)
        {
        let obj = T[rows-1];
        let pivotCol = -1;
        let minVal = 0;

        for(let j=0;j<cols-1;j++){
            if(obj[j] < minVal){
                minVal = obj[j];
                pivotCol = j;
            }
        }

        if(pivotCol === -1){
            resultArea.innerHTML += `<h4>Tableau ${tableauNum} (Optimal)</h4>`;
            console.debug(`Tableau ${tableauNum} (optimal) basic:`, basic);
            resultArea.innerHTML += createTableauHTML(T, basic, n, null, null, null, null);
            break;
        }

        // Find pivot row (leaving variable)
        let pivotRow = -1;
        let best = Infinity;
        for(let i=0;i<m;i++){
            if(T[i][pivotCol] > 0){
                let r = T[i][cols-1] / T[i][pivotCol];
                if(r < best){
                    best = r;
                    pivotRow = i;
                }
            }
        }

        // Identify entering and leaving variable for display
        let enteringVar = pivotCol;
        let leavingVar = basic[pivotRow];

        // Debug: log pivot selection and current basic array
        console.debug(`Tableau ${tableauNum} pivotCol: ${pivotCol}, pivotRow: ${pivotRow}`, 'basic:', basic);

        // Display tableau
        resultArea.innerHTML += `<h4>Tableau ${tableauNum}</h4>`;
        resultArea.innerHTML += createTableauHTML(T, basic, n, pivotCol, pivotRow, enteringVar, leavingVar);

        //STEP4; PIVOT ELIMINATION
        resultArea.innerHTML += "<b>Step:4 Pivotal Elimination</b><br>"
       
       

        let pivot = T[pivotRow][pivotCol];

        resultArea.innerHTML += `Pivot (k) = ${toFraction(pivot)}<br>`;
        resultArea.innerHTML += `1/k = ${toFraction(1/pivot)}<br><br>`;

                        
        // Pivot operation
        let p = T[pivotRow][pivotCol];
        for(let j=0;j<cols;j++)
            T[pivotRow][j] /= p;

        for(let i=0;i<rows;i++)
        {
            if(i !== pivotRow)
            {
                let f = T[i][pivotCol];
                for(let j=0;j<cols;j++)
                {
                    T[i][j] -= f * T[pivotRow][j];
                }
            }
        }
            

        // Update BV
        basic[pivotRow] = pivotCol;
        tableauNum++;
    }

    let sol = Array(n).fill(0);
    for(let i=0;i<m;i++){
        if(basic[i] < n)
            sol[basic[i]] = T[i][cols-1];
    }

    let Z = T[rows-1][cols-1];
    if(optType.value === "min") Z = -Z;

    resultArea.innerHTML += "<h3>Final Answer:</h3>";
    for(let j=0;j<n;j++){
        resultArea.innerHTML += `${varNames[j]} = ${toFraction(sol[j])}<br>`;
    }
    resultArea.innerHTML += `<b>Z = ${toFraction(Z)}</b>`;
} 
