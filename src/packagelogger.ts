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

  /** app path */
  public apppath: string;

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
        try {
          this.toggleDebug();
        }
        catch (ex) {
          packagelogger.channel.appendLine("**** " + ex + " ****");
        }
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.logPackage`, () => {
        try {
          this.logPackage();
        }
        catch (ex) {
          packagelogger.channel.appendLine("**** " + ex + " ****");
        }
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
      throw "ERROR*: no root or multi root is not supported";
    }
    this.projectpath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.channel.appendLine(`[${this.timestamp()}] - projectpath: ${this.projectpath}`);

    // computername
    this.computername = process.env.computername;
    if (this.computername === null) {
      throw `ERROR: environment variable COMPUTERNAME missing`;
    }
    this.channel.appendLine(`[${this.timestamp()}] - computername: ${this.computername}`);

    // log os and package
    // TODO get windows features
    // TODO get winget
    // TODO get scoop
    let machine: any = { os: {}, package: {} };
    this.logSysteminfo(machine);
    this.logEnv(machine);
    this.logService(machine);
    // this.logWinget(machine);
    this.logNodejs(machine);
    this.logChocolatey(machine);
    this.logPython(machine);
    this.logVscode(machine);
    this.logApp(machine);
    console.log(machine);

    // output log
    this.outputLog(machine);

    this.channel.appendLine(`[${this.timestamp()}] done.`);
  }

  //** output log */
  public outputLog(machine: any) {

    // check apppath
    this.apppath = `${this.projectpath}\\${this.appid}`;
    if (!fs.existsSync(this.apppath)) {
      fs.mkdirSync(this.apppath);
    }

    // check computernamepath
    this.computernamepath = `${this.apppath}\\${this.computername}`;
    // if (!fs.existsSync(this.computernamepath)) {
    //   fs.mkdirSync(this.computernamepath);
    //   this.channel.appendLine(`[${this.timestamp()}]   -> ${this.computernamepath}`);
    // }

    // 
    let oldpath = `${this.computernamepath}_old`;
    let newpath = `${this.computernamepath}_new`;
    if (fs.existsSync(newpath)) {
      fs.rmSync(newpath, { recursive: true, force: true });
    }
    fs.mkdirSync(newpath, { recursive: true });

    // output log
    for (const cat1 in machine) {
      fs.mkdirSync(`${newpath}\\${cat1}`);
      for (const cat2 in machine[cat1]) {
        fs.mkdirSync(`${newpath}\\${cat1}\\${cat2}`);
        for (const cat3 in machine[cat1][cat2]) {
          fs.writeFileSync(`${newpath}\\${cat1}\\${cat2}\\${cat3}`, machine[cat1][cat2][cat3]);
        }
      }
    }
  }

  /** log systeminfo */
  public logSysteminfo(machine: any) {

    let cmd = "systeminfo";
    let text = this.execCommand(`chcp 65001 1>NUL && ${cmd}`);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    let excludes = [
      "System Boot Time:",
      "Available Physical Memory:",
      "Virtual Memory: Available:",
      "Virtual Memory: In Use:"
    ];
    let lines = text.split(/[\r\n]+/);
    let content = "";
    for (const line of lines) {
      if (excludes.some(val => line.startsWith(val))) continue;
      content += line + "\r\n";
    }
    machine.os.system = {};
    machine.os.system.systeminfo = content;
  }

  /** log env */
  public logEnv(machine: any) {

    this.channel.appendLine(`[${this.timestamp()}] - environment variables`);

    let excludes = [
      "VSCODE_",
      "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL",
      "CHROME_CRASHPAD_PIPE_NAME",
      "SESSIONNAME"
    ];
    machine.os.env = {};
    for (const envname in process.env) {
      if (excludes.some(val => envname.startsWith(val))) continue;
      let name = envname;
      let content = `${envname} = ` + process.env[envname].replace(/;/g, "\r\n") || "";
      machine.os.env[name] = content;
    }
  }

  // TODO executing flag
  // TODO / : \ * ? < > | "
  
  /** log service */
  public logService(machine: any) {

    let cmd = "sc query";
    let text = this.execCommand(cmd);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    machine.os.service = {};
    let LABEL = "SERVICE_NAME: ";
    let lines = text.split(/[\r\n]+/);
    for (const line of lines) {
      if (line.startsWith(LABEL)) {
        let name = line.substr(LABEL.length); // get name
        let content = name;
        if (name && content) {
          machine.os.service[name] = content;
        }
      }
    }
  }

  // /** log winget */
  // public logWinget(machine: any) {

  //   // TODO too long name

  //   let cmd = "winget list";
  //   let text = this.execCommand(cmd);
  //   if (!text) { return; }

  //   this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

  //   machine.package.winget = {};
  //   let lines = text.split(/[\r\n]+/);
  //   lines.shift(); // delete first line
  //   for (const line of lines) {
  //     let word = line.split(/[ @]/).slice(1); // delete first word
  //     let name = word[0]; // get name
  //     let content = word.join(" "); // get content
  //     if (name && content) {
  //       machine.package.winget[name] = content;
  //     }
  //   }
  // }

  /** log winget */
  public logApp(machine: any) {

    let cmd1 = `reg query "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s`;
    let cmd2 = `reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s`;
    let cmd3 = `reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s`;
    let text = "";
    text += this.execCommand(`chcp 65001 1>NUL && ${cmd1}`) || "";
    text += this.execCommand(`chcp 65001 1>NUL && ${cmd2}`) || "";
    text += this.execCommand(`chcp 65001 1>NUL && ${cmd3}`) || "";
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd1}`);
    this.channel.appendLine(`[${this.timestamp()}] - ${cmd2}`);
    this.channel.appendLine(`[${this.timestamp()}] - ${cmd3}`);

    machine.package.app = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line

    let displayname = null;
    let displayversion = null;
    for (const line of lines) {

      let word = line.trim().split(/ +/);
      if (word[0] === "DisplayName") displayname = word.slice(2).join(" ");
      if (word[0] === "DisplayVersion") displayversion = word[2];

      if (displayname && displayversion) {

        let name = `${displayname}@${displayversion}`; // get name
        let content = name; // get content
        machine.package.app[name] = content;

        displayname = null;
        displayversion = null;
      }
    }
  }

  /** log chocolatey */
  public logChocolatey(machine: any) {

    let cmd = "choco list --local-only";
    let text = this.execCommand(cmd);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    machine.package.chocolatey = {};
    let lines = text.split(/[\r\n]+/);
    lines.pop(); // delete last line"
    for (const line of lines) {
      let word = line.split(/ +/);
      let name = word.join("@"); // get name
      let content = name; // get content
      if (name && content) {
        machine.package.chocolatey[name] = content;
      }
    }
  }

  /** log nodejs */
  public logNodejs(machine: any) {

    let cmd = "npm list --global";
    let text = this.execCommand(cmd);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    machine.package.nodejs = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    for (const line of lines) {
      if (line.endsWith("packages installed.")) continue;
      if (line.startsWith("Did you know Pro / Business automatically syncs with Programs and")) continue;
      if (line.startsWith(" Features? Learn more about Package Synchronizer at")) continue;
      if (line.startsWith(" https://chocolatey.org/compare")) continue;

      let name = line.split(/[ @]/).slice(1).join("@"); // delete first word and get name
      let content = name; // get content
      if (name && content) {
        machine.package.nodejs[name] = content;
      }
    }
  }

  /** log python */
  public logPython(machine: any) {

    let cmd = "pip list";
    let text = this.execCommand(cmd);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    machine.package.python = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    lines.shift(); // delete second line
    for (const line of lines) {
      let name = line.split(/ +/).join("@"); // get name
      let content = name; // get content
      if (name && content) {
        machine.package.python[name] = content;
      }
    }
  }

  /** log vscode */
  public logVscode(machine: any) {

    let cmd = "code --list-extensions --show-versions";
    let text = this.execCommand(cmd);
    if (!text) { return; }

    this.channel.appendLine(`[${this.timestamp()}] - ${cmd}`);

    machine.package.vscode = {};
    let lines = text.split(/[\r\n]+/);
    for (const line of lines) {
      let name = line; // get name
      let content = name; // get content
      if (name && content) {
        machine.package.vscode[name] = content;
      }
    }
  }

  /** execute command */
  public execCommand(cmd: string): string {
    let text = null;
    try {
      const options = { cwd: this.projectpath, };
      text = child_process.execSync(cmd, options).toString().trim();
    }
    catch (ex) {
      this.channel.appendLine(`[${this.timestamp()}] - [skip] ${cmd}`);
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
