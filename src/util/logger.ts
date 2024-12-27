export class Logger {
    private static colors: {[key: string]: string} = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
    };

    public static color(message: string, color: string = 'white'): string {
        const colorCode = this.colors[color] || this.colors.white;

        return `${colorCode}${message}${this.colors.reset}`;
    }

    public static getTime(): string {
        const now = new Date();

        return now.toTimeString().split(' ')[0];
    }

    public static error(...message: string[]): void {
        console.log(`[${this.getTime()}]`, this.color('[Error]', 'red'), ...message);
    }

    public static success(...message: string[]): void {
        console.log(`[${this.getTime()}]`, this.color('[Success]', 'green'), ...message);
    }

    public static warning(...message: string[]): void {
        console.log(`[${this.getTime()}]`, this.color('[Warning]', 'yellow'), ...message);
    }

    public static info(...message: string[]): void {
        console.log(`[${this.getTime()}]`, this.color('[Info]', 'cyan'), ...message);
    }
}
