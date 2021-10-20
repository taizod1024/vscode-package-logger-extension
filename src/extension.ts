import * as vscode from 'vscode';
import { packagelogger } from './PackageLogger';

// extension entrypoint
export function activate(context: vscode.ExtensionContext) {
    try {
        packagelogger.activate(context);
    }
    catch (ex) {
        packagelogger.channel.appendLine("**** " + ex + " ****");
    }
}
export function deactivate() { }
