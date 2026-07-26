import BaseProcess from "@phases/baseProcess";

const mockGetInput = jest.fn();
jest.mock('@actions/core', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    exportVariable: jest.fn(),
    getInput: (...args: any[]) => mockGetInput(...args),
    info: jest.fn(),
    setFailed: jest.fn(),
    warning: jest.fn(),
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

    async run(): Promise<void> {
        // Implementation not needed for tests
    }
}

describe('BaseProcess', () => {
    let phase: TestProcess;

    beforeEach(() => {
        phase = new TestProcess();
        mockGetInput.mockReturnValue('');
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
});
