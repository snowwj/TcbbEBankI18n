import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { forkJoin, from, Observable, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    private httpClient: HttpClient
  ) {

  }

  title = 'TcbbEBankI18N';
  US = '_en_US';
  JP = '_ja_JP';
  CN = '_zh_CN';
  TW = '_zh_TW';
  None = '';
  modelName = '';
  usJSON = [];
  jpJSON = [];
  cnJSON = [];
  twJSON = [];

  readyDownload = false;

  fileUpload($event) {
    const file = $event.target.files[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      const fileResult = fileReader.result.toString()
      this.analysis(fileResult.split(/[\n]/));
    }
    fileReader.readAsText(file, 'UTF-8');
  }

  analysis(fileArray: string[]) {
    this.httpClient.get('assets/i18nFileName/fileName.txt', { responseType: 'text' })
      .subscribe((resultTxt: string) => {
        const arr = [];
        const spliteArr = JSON.parse(JSON.stringify(resultTxt.split(/[\n]/)));
        spliteArr.forEach((obj: string) => {
          if (obj.indexOf(',') > -1) {
            arr.push(obj.replace(',', ''));
          }
        });
        this.getI18nProperties(fileArray, arr);
      });
  }

  getI18nPropertiesFile(allArr: string[]): Observable<any> {
    const arr = [];
    allArr.forEach((obj) => {
      arr.push(this.httpClient.get(`assets/i18n/${obj}`, { responseType: 'blob' }))
    })
    return forkJoin(arr).pipe(
      concatMap((arrRes) => {
        const arr = [];
        arrRes.forEach((file, index) => {
          const fileObj = {
            blob: file,
            fileName: allArr[index]
          }
          arr.push(fileObj);
        })
        return of(arr);
      })
    )
  }

  getI18nProperties(fileArray: string[], allArr: string[]) {

    this.usJSON = [];
    this.jpJSON = [];
    this.cnJSON = [];
    this.twJSON = [];

    this.getI18nPropertiesFile(allArr)
      .pipe(
        concatMap((allArr) => this.readFile(allArr))
      ).subscribe((readFileRes) => {
        fileArray.forEach((file) => {
          readFileRes.forEach((readFile) => {
            if (readFile.key === file.trim()) {
              const jsonObj = {
                key: '',
                value: '',
                file: ''
              }
              jsonObj.key = readFile.key;
              var x = readFile.value;
              var r = /\\u([\d\w]{4})/gi;
              x = x.replace(r, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
              });
              x = unescape(x);
              jsonObj.value = x;
              jsonObj.file = readFile.fileName;
              if (readFile.fileName.indexOf(this.US) > -1) {
                this.usJSON.push(jsonObj);
              } else if (readFile.fileName.indexOf(this.CN) > -1) {
                this.cnJSON.push(jsonObj);
              } else if (readFile.fileName.indexOf(this.JP) > -1) {
                this.jpJSON.push(jsonObj);
              } else if (readFile.fileName.indexOf(this.TW) > -1) {
                this.twJSON.push(jsonObj);
              }
            }
          })
        })

        console.log('usJSON = ', this.usJSON);
        console.log('cnJSON = ', this.cnJSON);
        console.log('jpJSON = ', this.jpJSON);
        console.log('twJSON = ', this.twJSON);
        this.readyDownload = true;
      });
  }

  readFile(fileArr: {
    blob: Blob,
    fileName: string
  }[]): Observable<{
    key: string,
    value: string,
    fileName: string
  }[]> {
    let arr = [];
    return new Observable(obs => {
      fileArr.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          const fileResult = reader.result.toString().split(/[\n]/);
          fileResult.forEach((obj) => {
            if (obj.indexOf('=') > -1) {
              const newObj: string = JSON.parse(JSON.stringify(obj.split('=')));
              const i18nObj = {
                key: newObj[0],
                value: newObj[1],
                fileName: file.fileName
              }
              arr.push(i18nObj);
            }
          })
          if (index === fileArr.length - 1) {
            obs.next(arr);
          }
        }
        reader.readAsText(file.blob, 'UTF-8');
      })
    });
  }

  download(type: string) {
    if (this.modelName) {
      if (type === 'TW') {
        this.formatJSON(this.twJSON);
      } else if (type === 'CN') {
        this.formatJSON(this.cnJSON);
      } else if (type === 'JP') {
        this.formatJSON(this.jpJSON);
      } else {
        this.formatJSON(this.usJSON);
      }
    } else {
      alert('請輸入功能模組名稱!!');
    }
  }

  formatJSON(jsonArr: any[]) {
    const jsonObj = {};
    jsonArr.forEach((obj) => {
      jsonObj[obj.key] = obj.value.trim();
    });

    const str = JSON.stringify(jsonObj, null, 2);
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], {
      type: "application/json;charset=utf-8"
    });
    FileSaver.saveAs(blob, this.modelName);
  }
}
