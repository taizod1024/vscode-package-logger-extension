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
      }
      catch (ex) {
        reject(ex);
      }
    });
  });
};

/** package-logger-extesnion class */
class PackageLogger {

  /** application id for vscode */
  public appid = "package-logger";

  /** channel on vscode */
  public channel: vscode.OutputChannel;

  /** project path */
  public projectpath: string;

  /** app path name */
  public apppathname = "package-log";

  /** app path */
  public apppath: string;

  /** computer name h*/
  public computername: string;

  /** constructor */
  constructor() { }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {

    // init context
    this.channel = vscode.window.createOutputChannel(this.appid);
    this.channel.appendLine(`[${this.timestamp()}] ${this.appid} activated`);

    // init vscode
    context.subscriptions.push(
      vscode.commands.registerCommand(`${this.appid}.logPackage`, () => {
        this.logPackageAsync()
          .catch(reason => {
            packagelogger.channel.appendLine("**** " + reason + " ****");
          });
      })
    );
  }

  /** log package */
  public async logPackageAsync() {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] logPackage:`);
    this.channel.show();

    // check projectpath
    this.projectpath = null;
    if (vscode.workspace.workspaceFolders?.length !== 1) {
      throw "ERROR*: no root or multi root is not supported";
    }
    this.projectpath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.channel.appendLine(`[${this.timestamp()}] - projectpath: ${this.projectpath}`);

    // check computername
    this.computername = process.env.computername;
    if (this.computername === null) {
      throw `ERROR: environment variable COMPUTERNAME missing`;
    }
    this.channel.appendLine(`[${this.timestamp()}] - computername: ${this.computername}`);

    // log any
    let machine: any = { os: {}, package: {} };
    await timeoutPromise(() => this.logSysteminfo(machine));
    await timeoutPromise(() => this.logEnv(machine));
    await timeoutPromise(() => this.logApp(machine));
    await timeoutPromise(() => this.logChocolatey(machine));
    await timeoutPromise(() => this.logNodejs(machine));
    await timeoutPromise(() => this.logPython(machine));
    await timeoutPromise(() => this.logVscode(machine));
    await timeoutPromise(() => this.logWinget(machine));
    await timeoutPromise(() => this.logScoop(machine));

    // output log
    this.outputLog(machine);

    this.channel.appendLine(`[${this.timestamp()}] - done`);
  }

  /** log systeminfo */
  public logSysteminfo(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - systeminfo`);

    // show command
    let cmd = "systeminfo";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(`chcp 65001 1>NUL && ${cmd}`);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    // modify processor clock 
    text = text.replace(/~[0-9]+ Mhz/g, "~xxxx Mhz");

    // name to be excluded
    let excludes = [
      "System Boot Time:",
      "Available Physical Memory:",
      "Virtual Memory: Available:",
      "Virtual Memory: In Use:"
    ];

    // modify text
    let lines = text.split(/[\r\n]+/);
    let value = "";
    for (const line of lines) {
      if (excludes.some(val => line.startsWith(val))) continue; // exclude dynamic section
      value += line + "\r\n";
    }
    machine.os.system = {};
    machine.os.system.systeminfo = value;
  }

  /** log env */
  public logEnv(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - environment variables`);
    this.channel.appendLine(`[${this.timestamp()}]   - environment variables inherited from the parent process`);

    // name to be excluded because of context
    let excludes = [
      "__COMPAT_LAYER",                             // for uac
      "ELECTRON_RUN_AS_NODE",                       // for electron
      "VSCODE_",                                    // for vscode
      "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL", // for debug
      "CHROME_CRASHPAD_PIPE_NAME",                  // for chrome
      "SESSIONNAME"                                 // for child process
    ];

    // get env from process information
    machine.os.env = {};
    for (const envname in process.env) {
      if (excludes.some(val => envname.startsWith(val))) continue; // exclude context
      let name = envname;
      let value = process.env[envname] || "";
      if (value.indexOf(";") < 0) {
        value = `${envname}=${value}`; // single value
      } else {
        value = `${envname}=\r\n` + value.replace(/;/g, "\r\n"); // multivalue
      }
      machine.os.env[name] = value;
    }
  }

  /** log app */
  public logApp(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - app`);

    // show command
    let cmd1 = `reg query HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    let cmd2 = `reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    let cmd3 = `reg query HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s`;
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd1}`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd2}`);
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd3}`);

    let text = "";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd1}`) || "") + "\r\n";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd2}`) || "") + "\r\n";
    text += (this.execCommand(`chcp 65001 1>NUL && ${cmd3}`) || "") + "\r\n";
    text += "HKEY"; // for sentinel
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    machine.package.app = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line

    // get app from command result
    let displayname = null;
    let displayversion = null;
    for (const line of lines) {

      let word = line.trim().split(/ +/);
      if (word[0] === "DisplayName") displayname = word.slice(2).join(" ");
      if (word[0] === "DisplayVersion") displayversion = word[2];

      if (line.startsWith("HKEY") && displayname) {

        let name;
        if (!displayversion) {
          name = displayname; // name without version
        } else {
          name = `${displayname}@${displayversion}`; // name with version
        }
        let value = name;
        machine.package.app[name] = value;

        displayname = null;
        displayversion = null;
      }
    }
  }

  /** log winget */
  public logWinget(_machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - winget`);
    this.channel.appendLine(`[${this.timestamp()}]   => not implemented`);

  }

  /** log chocolatey */
  public logChocolatey(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - chocolatey`);

    // show command
    let cmd = "choco list --local-only";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    // get packages from command result
    machine.package.chocolatey = {};
    let lines = text.split(/[\r\n]+/);
    lines.pop(); // delete last line"

    for (const line of lines) {
      let word = line.split(/ +/);
      if (word.length !== 2) continue; // check name and version
      let name = word.join("@"); // name with version
      let value = name;
      if (name && value) {
        machine.package.chocolatey[name] = value;
      }
    }
  }

  /** log scoop */
  public logScoop(_machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - scoop`);
    this.channel.appendLine(`[${this.timestamp()}]   => not implemented`);

  }

  /** log nodejs */
  public logNodejs(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - nodejs`);

    // show command
    let cmd = "npm list --global";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    // get packages from command result
    machine.package.nodejs = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    for (const line of lines) {
      if (line.endsWith("packages installed.")) continue;

      // ignore message
      if (line.startsWith("Did you know Pro / Business automatically syncs with Programs and")) continue;
      if (line.startsWith(" Features? Learn more about Package Synchronizer at")) continue;
      if (line.startsWith(" https://chocolatey.org/compare")) continue;

      let name = line.split(/[ @]/).slice(1).join("@"); // delete first word and get name
      let value = name;
      if (name && value) {
        machine.package.nodejs[name] = value;
      }
    }
  }

  /** log python */
  public logPython(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - python`);

    // show command
    let cmd = "pip list";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    // get packages from command result
    machine.package.python = {};
    let lines = text.split(/[\r\n]+/);
    lines.shift(); // delete first line
    lines.shift(); // delete second line
    for (const line of lines) {
      let name = line.split(/ +/).join("@"); // name with version
      let value = name;
      if (name && value) {
        machine.package.python[name] = value;
      }
    }
  }

  /** log vscode */
  public logVscode(machine: any) {

    // show channel
    this.channel.appendLine(`[${this.timestamp()}] - vscode`);

    // show command
    let cmd = "code --list-extensions --show-versions";
    this.channel.appendLine(`[${this.timestamp()}]   $ ${cmd}`);
    let text = this.execCommand(cmd);
    if (!text) {
      this.channel.appendLine(`[${this.timestamp()}]     => not found`);
      return;
    }

    // get packages from command result
    machine.package.vscode = {};
    let lines = text.split(/[\r\n]+/);
    for (const line of lines) {
      let name = line; // name with version
      let value = name;
      if (name && value) {
        machine.package.vscode[name] = value;
      }
    }
  }

  //** output log */
  public outputLog(machine: any) {

    this.channel.appendLine(`[${this.timestamp()}] - output`);

    // check apppath
    this.apppath = `${this.projectpath}\\${this.apppathname}`;
    if (!fs.existsSync(this.apppath)) {
      fs.mkdirSync(this.apppath);
    }

    // clear compuernamepath
    let computernamepath = `${this.apppath}\\${this.computername}`;
    if (fs.existsSync(computernamepath)) {
      fs.rmSync(computernamepath, { recursive: true, force: true });
    }
    fs.mkdirSync(computernamepath, { recursive: true });

    // output log
    for (const cat1 in machine) {
      fs.mkdirSync(`${computernamepath}\\${cat1}`);
      for (const cat2 in machine[cat1]) {
        fs.mkdirSync(`${computernamepath}\\${cat1}\\${cat2}`);
        for (const cat3 in machine[cat1][cat2]) {
          let cat3x = cat3.replace(/[:/\\\*\?\"\|<>]/g, ""); // : / \ * ? " |< > 
          if (cat3 !== cat3x) {
            this.channel.appendLine(`[${this.timestamp()}]   - rename: ${cat3} -> ${cat3x}`);
          }
          try {
            fs.writeFileSync(`${computernamepath}\\${cat1}\\${cat2}\\${cat3x}`, machine[cat1][cat2][cat3]);
          }
          catch (ex) {
            throw ex;
          }
        }
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

  /** return timestamp string */
  public timestamp(): string {
    return new Date().toLocaleString("ja-JP").split(" ")[1];
  }
}
export const packagelogger = new PackageLogger();
