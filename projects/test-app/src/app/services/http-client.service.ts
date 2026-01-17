import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IHttpClient } from '@areaprog/ng-store';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService implements IHttpClient {
  private http = inject(HttpClient);

  public delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url).pipe(tap(() => console.log(`DELETE ${url}`)));
  }

  public get<T>(url: string): Observable<T> {
    return this.http.get<T>(url).pipe(tap(() => console.log(`GET ${url}`)));
  }

  public post<T>(url: string, data: unknown): Observable<T> {
    return this.http.post<T>(url, data).pipe(tap(() => console.log(`POST ${url}`)));
  }

  public put<T>(url: string, data: unknown): Observable<T> {
    return this.http.put<T>(url, data).pipe(tap(() => console.log(`PUT ${url}`)));
  }
}
