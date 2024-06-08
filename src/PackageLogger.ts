import * as vscode from "vscode";
import * as fs from "fs";
import child_process, { ExecFileSyncOptions } from "child_process";
import { resolve } from "path/posix";
import { rejects } from "assert";

/** promise with timeout */
const timeoutPromise = (func: () => void) => {
  return new Promise((resolve, reject) => {
    setTimeout(function () {
      try {
        func();
        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
  });
};

/** package-logger-extesnion class */
class PackageLogger {
  /** application id for vscode */
  public appId = "package-logger";

  /** application name */
  public appName = "Package Logger";

  /** channel on vscode */
  public channel: vscode.OutputChannel;

  /** project path */
  public projectPath: string;

  /** app path */
  public appPath: string;

  /** computer name */
  public computerName: string;

  /** extension path */
  public extensionPath: string;

  /** log path */
  public logPath: string;

  /** tmp path */
  public tmpPath: string;

  /** update flag */
  public isUpdate: boolean;

  /** constructor */
  constructor() {}

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {
    // init context
    this.channel = vscode.window.createOutputChannel(this.appName, { log: true });
    this.channel.appendLine(`${this.appId} activated`);

    // init vscode
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appId}.updateAndLogPackage`, async () => {
        this.channel.show();
        this.extensionPath = context.extensionPath;
        try {
          await this.checkProjectPathAsync();
          await this.logPackageAsync(true);
        } catch (reason) {
          packagelogger.channel.appendLine("**** " + reason + " ****");
        }
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appId}.logPackage`, async () => {
        this.channel.show();
        this.extensionPath = context.extensionPath;
        try {
          await this.checkProjectPathAsync();
          await this.logPackageAsync(false);
        } catch (reason) {
          packagelogger.channel.appendLine("**** " + reason + " ****");
        }
      })
    );
  }

  /** check project path */
  public async checkProjectPathAsync() {
    // check project path
    this.projectPath = null;
    if (vscode.workspace.workspaceFolders?.length !== 1) {
      throw "ERROR: no root or multi root is not supported";
    }
    this.projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.appPath = `${this.projectPath}\\${this.appId}`;

    // confirm make folder
    if (!fs.existsSync(this.appPath)) {
      let plchld = ` ${this.appId} FOLDER NOT FOUND, MAKE ${this.appId} FOLDER ?`;
      let choice = `YES, MAKE ${this.appId} FOLDER.`;
      return vscode.window
        .showQuickPick([choice], {
          placeHolder: plchld,
          ignoreFocusOut: true,
        })
        .then(confirm => {
          if (confirm !== choice) {
            throw "CANCELED";
          }
        });
    }
  }

  /** log package async */
  public async logPackageAsync(isUpdate: boolean) {
    // show channel
    this.channel.appendLine(`--------`);
    this.channel.appendLine(`logPackageAsync:`);

    // check properties
    this.computerName = process.env.computername;
    if (this.computerName === null) {
      throw `ERROR: environment variable COMPUTERNAME missing`;
    }

    // create app path
    if (!fs.existsSync(this.appPath)) {
      fs.mkdirSync(this.appPath, { recursive: true });
    }

    this.channel.appendLine(`- computername: ${this.computerName}`);
    this.logPath = `${this.appPath}\\${this.computerName}`;
    this.tmpPath = `${process.env.TMP}\\${this.appId}\\${this.computerName}`;
    this.isUpdate = isUpdate;
    this.channel.appendLine(`- appPath: ${this.appPath}`);
    this.channel.appendLine(`- logPath: ${this.logPath}`);
    this.channel.appendLine(`- tmpPath: ${this.tmpPath}`);
    this.channel.appendLine(`- isUpdate: ${this.isUpdate}`);

    // create temporary path
    if (!fs.existsSync(this.tmpPath)) {
      fs.mkdirSync(this.tmpPath, { recursive: true });
    }

    // exec command as administrator
    this.channel.appendLine(`- exec command as administrator`);
    let cmd = `powershell -command start-process 'cmd.exe' -argumentlist '/c','powershell','${this.extensionPath}\\bin\\log-package.ps1','${this.logPath}','${this.tmpPath}','$${this.isUpdate}' -verb runas -wait`;
    this.channel.appendLine(`  $ ${cmd}`);
    this.execCommand(cmd);

    // check temporary path
    if (fs.existsSync(this.tmpPath)) {
      throw `ERROR: command failed`;
    }

    this.channel.appendLine(`- done`);
  }

  /** execute command */
  public execCommand(cmd: string, trim = true): string {
    let text = null;
    try {
      const options = { cwd: this.projectPath };
      text = child_process.execSync(cmd, options).toString();
      if (trim) text = text.trim();
    } catch (ex) {}
    return text;
  }
}
export const packagelogger = new PackageLogger();
