# package-logger

Output Windows application and package list with version.
Use it with Git.

- package-logger
  - os
    - system information  
      `systeminfo`
    - environment variables
  - package
    - windows application list  
      `reg query ...`
    - [chocolatey](https://chocolatey.org/) package list  
      `choco list --local-only`
    - [nodejs](https://www.npmjs.com/) package list  
      `npm list --global`
    - [python](https://pypi.org/) package list  
      `pip list`
    - [vscode](https://marketplace.visualstudio.com/vscode) extension list  
      `code --list-extensions -show-versions`
