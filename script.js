class RPNCalculator {
    constructor() {
        this.stack = [];
        this.inputBuffer = '';
        this.memory = 0;
        this.base = 10;
        this.isInputting = false; // True if user is currently typing a number

        this.displayEl = document.getElementById('main-display');
        this.modeEl = document.getElementById('indicator-mode');

        this.init();
    }

    init() {
        // Button listeners
        document.querySelectorAll('.key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                if (target.dataset.num) this.handleNumber(target.dataset.num);
                if (target.dataset.op) this.handleOperator(target.dataset.op);
                if (target.dataset.cmd) this.handleCommand(target.dataset.cmd);
                if (target.dataset.val) this.handleValue(target.dataset.val);
            });
        });

        // Base listeners
        document.querySelectorAll('.base-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setBase(parseInt(e.target.dataset.base)));
        });

        // Keyboard support (basic)
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        this.updateDisplay();
    }

    handleNumber(char) {
        // Validate input for base
        if (this.base !== 16 && /[a-fA-F]/.test(char)) return;
        if (this.base !== 10 && char === '.') return; // No decimals in non-DEC for now

        if (!this.isInputting) {
            this.inputBuffer = '';
            this.isInputting = true;
        }

        // Prevent multiple dots
        if (char === '.' && this.inputBuffer.includes('.')) return;

        this.inputBuffer += char;
        this.updateDisplay(this.inputBuffer);
    }

    handleCommand(cmd) {
        switch (cmd) {
            case 'enter':
                if (this.isInputting) {
                    this.pushStack();
                } else {
                    // Duplicate X if not inputting
                    if (this.stack.length > 0) {
                        this.pushStack(this.stack[this.stack.length - 1]);
                    }
                }
                break;
            case 'backspace':
                if (this.isInputting) {
                    this.inputBuffer = this.inputBuffer.slice(0, -1);
                    if (this.inputBuffer === '') {
                        this.inputBuffer = '0';
                        this.isInputting = false;
                    }
                    this.updateDisplay(this.inputBuffer);
                } else {
                    this.clearLatest();
                }
                break;
            case 'clx':
                this.inputBuffer = '0';
                this.isInputting = false;
                this.updateDisplay('0');
                break;
            case 'clear-stack':
                this.stack = [];
                this.inputBuffer = '0';
                this.isInputting = false;
                this.updateDisplay('0');
                break;
            case 'swap':
                if (this.stack.length < 1) return; // Need at least X (if we consider input as X, complex)
                // Behavior: If inputting, custom push?
                // Standard RPN: X is stack[0], Y is stack[1]
                // If inputting, current buffer is X.
                if (this.isInputting) this.pushStack();
                if (this.stack.length < 2) return;

                [this.stack[this.stack.length - 1], this.stack[this.stack.length - 2]] =
                    [this.stack[this.stack.length - 2], this.stack[this.stack.length - 1]];
                this.updateDisplay(this.stack[this.stack.length - 1]);
                break;
            case 'roll':
                this.rollStack();
                break;
            case 'sto':
                const val = this.getCurrentX();
                this.memory = val;
                this.isInputting = false; // Stop inputting after STO
                break;
            case 'rcl':
                this.pushStack(this.memory, true);
                break;
            case 'chs':
                if (this.isInputting) {
                    if (this.inputBuffer.startsWith('-')) this.inputBuffer = this.inputBuffer.substring(1);
                    else this.inputBuffer = '-' + this.inputBuffer;
                    this.updateDisplay(this.inputBuffer);
                } else {
                    if (this.stack.length > 0) {
                        this.stack[this.stack.length - 1] *= -1;
                        this.updateDisplay(this.stack[this.stack.length - 1]);
                    }
                }
                break;
        }
    }

    handleOperator(op) {
        if (this.isInputting) this.pushStack();

        if (this.stack.length < 1) return; // Need args

        // Unary
        if (['sqrt', 'sqr', 'log', 'exp', 'inv'].includes(op)) {
            const x = this.stack.pop();
            let res = 0;
            switch (op) {
                case 'sqrt': res = Math.sqrt(x); break;
                case 'sqr': res = x * x; break;
                case 'log': res = Math.log(x); break;
                case 'exp': res = Math.exp(x); break;
                case 'inv': res = 1 / x; break;
            }
            this.stack.push(res);
            this.updateDisplay(res);
            return;
        }

        // Binary
        if (this.stack.length < 2) return;
        const y = this.stack.pop(); // Note: logic might be tricky with pop order
        const x = this.stack.pop(); // Actually Stack: [..., Z, Y, X]. Pop -> X. Pop -> Y.
        // Wait, standard array stack: [1, 2, 3]. Pop -> 3 (X). Pop -> 2 (Y).
        // Correct order for calculation: Y op X?
        // e.g. 5 ENTER 3 DIV. 5 is Y. 3 is X. 5/3.

        // Let's redefine vars to avoid confusion
        const valX = y;
        const valY = x;

        let res = 0;
        switch (op) {
            case '+': res = valY + valX; break;
            case '-': res = valY - valX; break;
            case '*': res = valY * valX; break;
            case '/': res = valY / valX; break;
            case 'pow': res = Math.pow(valY, valX); break;
        }
        this.stack.push(res);
        this.updateDisplay(res);
    }

    handleValue(val) {
        let num = 0;
        if (val === 'pi') num = Math.PI;
        if (val === 'e') num = Math.E;
        if (val === '42') num = 42;

        if (this.isInputting) this.pushStack(); // Push current input before constant
        this.stack.push(num);
        this.updateDisplay(num);
    }

    getCurrentX() {
        if (this.isInputting) return parseFloat(this.inputBuffer);
        if (this.stack.length > 0) return this.stack[this.stack.length - 1];
        return 0;
    }

    pushStack(val = null, force = false) {
        if (val !== null) {
            this.stack.push(val);
            this.updateDisplay(val);
        } else {
            if (this.inputBuffer === '') return; // Don't push empty

            let num;
            if (this.base === 10) {
                num = parseFloat(this.inputBuffer);
            } else {
                // Integer parse for other bases
                num = parseInt(this.inputBuffer, this.base);
            }

            this.stack.push(num);
            this.inputBuffer = '';
            this.isInputting = false;
        }
    }

    clearLatest() {
        // CLx behavior: 0 to X
        if (this.stack.length > 0) this.stack.pop();
        this.updateDisplay();
    }

    rollStack() {
        // Roll down
        if (this.stack.length < 2) return;
        const x = this.stack.pop();
        this.stack.unshift(x);
        this.updateDisplay(this.stack[this.stack.length - 1]);
    }

    setBase(b) {
        if (this.isInputting) this.pushStack(); // Commit current input before switching
        this.base = b;
        document.querySelectorAll('.base-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.base) === b);
        });

        // Toggle Hex Keys
        document.querySelectorAll('.hex-key').forEach(key => {
            if (b === 16) key.classList.remove('disabled');
            else key.classList.add('disabled');
        });

        this.modeEl.textContent = b === 10 ? '' : `BASE ${b}`;
        this.updateDisplay();
    }

    updateDisplay(val = null) {
        if (val !== null && typeof val === 'string') {
            this.displayEl.textContent = val.toUpperCase();
            return;
        }

        let displayVal = val;
        if (displayVal === null) {
            if (this.stack.length > 0) displayVal = this.stack[this.stack.length - 1];
            else displayVal = 0;
        }

        // Format based on base
        let num = Number(displayVal);
        let str = '';
        if (isNaN(num)) str = 'Error';
        else {
            str = num.toString(this.base).toUpperCase();
        }

        this.displayEl.textContent = str;
        console.log('Stack:', this.stack, 'Buffer:', this.inputBuffer);
    }

    handleKeyboard(e) {
        const key = e.key;
        if (isFinite(key)) this.handleNumber(key);
        if (this.base === 16 && /^[a-fA-F]$/.test(key)) this.handleNumber(key.toUpperCase());
        if (['+', '-', '*', '/'].includes(key)) this.handleOperator(key);
        if (key === 'Enter') { e.preventDefault(); this.handleCommand('enter'); }
        if (key === 'Backspace') this.handleCommand('backspace');
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new RPNCalculator();
});
