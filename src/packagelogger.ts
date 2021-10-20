import * as vscode from "vscode";
import * as fs from "fs";
import child_process, { ExecFileSyncOptions } from "child_process";

/** package-logger-extesnion class */
class PackageLogger {

  /** application id for vscode */
  public appid = "package-logger";

  /** flag for debug  */
  public debug: boolean;

  /** channel on vscode */
  public channel: vscode.OutputChannel;

  /** project path */
  public projectpath: string;

  /** computer name h*/
  public computername: string;

  /** computer name pathh */
  public computernamepath: string;

  /** os path */
  public osxpath: string;

  /** package path */
  public packagexpath: string;

  /** constructor */
  constructor() { }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {

    // init context
    this.channel = vscode.window.createOutputChannel(this.appid);
    this.channel.appendLine(`[${this.timestamp()}] ${this.appid} activated`);

    // init context
    this.debug = false;

    // init vscode
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.toggleDebug`, () => {
        this.toggleDebug();
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.logPackage`, () => {
        this.logPackage();
      })
    );
  }

  /** toggle debug */
  public toggleDebug() {
    this.channel.appendLine(`--------`);

    this.setDebug(!this.debug);
  }

  /** log package */
  public logPackage() {
    this.channel.appendLine(`--------`);
    this.channel.appendLine(`[${this.timestamp()}] logPackage:`);
    this.channel.show();

    // projectpath
    this.projectpath = null;
    if (vscode.workspace.workspaceFolders?.length !== 1) {
      const msg = `*** WARN: no root or multi root is not supported ***`;
      this.channel.appendLine(msg);
    }
    this.projectpath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.channel.appendLine(`[${this.timestamp()}] - projectpath: ${this.projectpath}`);

    // computername
    this.computername = process.env.computername;
    this.channel.appendLine(`[${this.timestamp()}] - computername: ${this.computername}`);
    this.computernamepath = `${this.projectpath}\\${this.computername}`;
    if (!fs.existsSync(this.computernamepath)) {
      fs.mkdirSync(this.computernamepath);
      this.channel.appendLine(`[${this.timestamp()}]   -> ${this.computernamepath}`);
    }

    // package
    this.packagexpath = `${this.computernamepath}\\package`;
    if (!fs.existsSync(this.packagexpath)) {
      fs.mkdirSync(this.packagexpath);
      this.channel.appendLine(`[${this.timestamp()}]   -> ${this.packagexpath}`);
    }

    // os
    this.osxpath = `${this.computernamepath}\\os`;
    if (!fs.existsSync(this.osxpath)) {
      fs.mkdirSync(this.osxpath);
      this.channel.appendLine(`[${this.timestamp()}]   -> ${this.osxpath}`);
    }

    let pkgs;

    pkgs = this.logNodejs();
    console.log(pkgs);

    pkgs = this.logChocolatey();
    console.log(pkgs);

    pkgs = this.logEnv();
    console.log(pkgs);

    this.channel.appendLine(`[${this.timestamp()}] done.`);
  }

  /** log nodejs */
  public logNodejs() {

    let pkgs: any = null;
    let text = this.execCommand(`npm list --global`);
    if (!text) { return pkgs; }

    let lines = text.split(/[\r\n]/);
    lines.shift(); // delete first line
    pkgs = {};
    for (const line of lines) {
      let word = line.split(/[ @]/).slice(1); // delete first word
      let name = word[0]; // get name
      let content = word.join(" "); // get content
      if (name && content) {
        pkgs[name] = content;
      }
    }
    return pkgs;
  }

  /** log chocolatey */
  public logChocolatey() {

    let pkgs: any = null;
    let text = this.execCommand(`choco list --local-only`);
    if (!text) { return pkgs; }

    let lines = text.split(/[\r\n]/);
    lines.pop(); // delete last line"
    pkgs = {};
    for (const line of lines) {
      let word = line.split(/ /);
      let name = word[0]; // get name
      let content = word.join(" "); // get content
      if (name && content) {
        pkgs[name] = content;
      }
    }
    return pkgs;
  }

  /** log env */
  public logEnv() {

    let pkgs: any = {};
    for (const envname in process.env) {
      if (!envname.startsWith("VSCODE_")) {
        pkgs[envname] = process.env[envname].replace(";", ";\r\n") || "";
      }
    }
    return pkgs;
  }

  /** execute command */
  public execCommand(cmd: string): string {
    let text = null;
    try {
      const options = { cwd: this.projectpath, };
      text = child_process.execSync(cmd, options).toString().trim();
    }
    catch (ex) {
      this.channel.appendLine(`[${this.timestamp()}] error`);
    }
    return text;
  }


  /** set debug */
  public setDebug(debug: boolean, force = false) {
    this.channel.appendLine(`[${this.timestamp()}] setDebug(${[...arguments]})`);

    if (this.debug !== debug || force) {
      this.debug = debug;
      vscode.commands.executeCommand("setContext", `${this.appid}Debug`, this.debug);
    }
  }

  /** return timestamp string */
  public timestamp(): string {
    return new Date().toLocaleString("ja-JP").split(" ")[1];
  }
}
export const packagelogger = new PackageLogger();
