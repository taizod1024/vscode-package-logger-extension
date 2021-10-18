import * as vscode from 'vscode';
import { packagelogger } from './packagelogger';

// extension entrypoint
export function activate(context: vscode.ExtensionContext) {
    packagelogger.activate(context);
}
export function deactivate() { }
