import BaseProcess from "@phases/baseProcess";

const mockGetInput = jest.fn();
const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockWarning = jest.fn();
const mockError = jest.fn();
const mockExportVariable = jest.fn();
const mockSetFailed = jest.fn();

jest.mock('@actions/core', () => ({
    debug: (...args: any[]) => mockDebug(...args),
    error: (...args: any[]) => mockError(...args),
    exportVariable: (...args: any[]) => mockExportVariable(...args),
    getInput: (...args: any[]) => mockGetInput(...args),
    info: (...args: any[]) => mockInfo(...args),
    setFailed: (...args: any[]) => mockSetFailed(...args),
    warning: (...args: any[]) => mockWarning(...args),
}));

class TestProcess extends BaseProcess {
    public test: string = '';
    public testBool: boolean = false;
    parseInputs(): void {
        this.test = this.getInput('test_env_key', true);
    }

    parseInputsWithBoolean(): void {
        this.testBool = this.getInputBoolean('test_bool_key', false, false);
    }

    parseInputsNotRequired(): void {
        this.test = this.getInput('test_not_required', false);
    }

    callDebug(msg: string): void { this.debug(msg); }
    callInfo(msg: string): void { this.info(msg); }
    callWarning(msg: string): void { this.warning(msg); }
    callError(msg: string): void { this.error(msg); }
    callExportVariable(name: string, value: string): void { this.exportVariable(name, value); }
    callSetFailed(msg: string): void { this.setFailed(msg); }

    async run(): Promise<void> {
        // Implementation not needed for tests
    }
}

describe('BaseProcess', () => {
    let phase: TestProcess;

    beforeEach(() => {
        phase = new TestProcess();
        mockGetInput.mockReturnValue('');
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env['test-env-key'];
        delete process.env['test_env_key'];
        delete process.env['test_bool_key'];
    });

    describe('getInput', () => {
        test('Using \'-\' as divider for enviroment variable', () => {
            process.env['test-env-key'] = 'test-value';
            phase.parseInputs();
            expect(phase.test).toBe('test-value');
        });
        test('Using \'_\' as divider for enviroment variable', () => {
            process.env['test_env_key'] = 'test-value';
            phase.parseInputs();
            expect(phase.test).toBe('test-value');
        });

        test('Should return empty string when input is not required and not provided', () => {
            phase.parseInputsNotRequired();
            expect(phase.test).toBe('');
        });

        test('Should throw when required input is missing', () => {
            expect(() => phase.parseInputs()).toThrow(
                'Input required and not supplied: test_env_key'
            );
        });
    });

    describe('getInputBoolean', () => {
        test('Should return true when value is "true"', () => {
            process.env['test_bool_key'] = 'true';
            phase.parseInputsWithBoolean();
            expect(phase.testBool).toBe(true);
        });

        test('Should return false when value is "false"', () => {
            process.env['test_bool_key'] = 'false';
            phase.parseInputsWithBoolean();
            expect(phase.testBool).toBe(false);
        });

        test('Should return default value when input is not provided', () => {
            phase.parseInputsWithBoolean();
            expect(phase.testBool).toBe(false);
        });

        test('Should throw on invalid boolean value', () => {
            process.env['test_bool_key'] = 'not-a-boolean';
            expect(() => phase.parseInputsWithBoolean()).toThrow(
                'Invalid boolean value: test_bool_key'
            );
        });
    });

    describe('wrapper methods', () => {
        it('should call core.debug via debug wrapper', () => {
            phase.callDebug('test debug');
            expect(mockDebug).toHaveBeenCalledWith('test debug');
        });

        it('should call core.info via info wrapper', () => {
            phase.callInfo('test info');
            expect(mockInfo).toHaveBeenCalledWith('test info');
        });

        it('should call core.warning via warning wrapper', () => {
            phase.callWarning('test warning');
            expect(mockWarning).toHaveBeenCalledWith('test warning');
        });

        it('should call core.error via error wrapper', () => {
            phase.callError('test error');
            expect(mockError).toHaveBeenCalledWith('test error');
        });

        it('should call core.exportVariable via exportVariable wrapper', () => {
            phase.callExportVariable('MY_VAR', 'my_value');
            expect(mockExportVariable).toHaveBeenCalledWith('MY_VAR', 'my_value');
        });

        it('should call core.setFailed via setFailed wrapper', () => {
            phase.callSetFailed('test failure');
            expect(mockSetFailed).toHaveBeenCalledWith('test failure');
        });
    });
});
