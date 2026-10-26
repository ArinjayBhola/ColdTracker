export interface TrackingRow {
 id: string; tracking_enabled: boolean; delivery_state: string; open_count: number;
 created_at: string | Date; first_open_at: string | Date | null; last_open_at: string | Date | null;
 window_start: string | Date | null; window_count: number;
}
export interface TrackingUpdate {open_count:number;first_open_at:string;last_open_at:string;window_start:string|Date|null;window_count:number}
declare const core: {
 tokenHash(token: unknown): string|null;
 eligible(row: TrackingRow|null,now:string):boolean;
 recordOpen(repo:{lockToken(hash:string):Promise<TrackingRow|null>;insertEvent(id:string,message:string,now:string):Promise<boolean>;update(id:string,values:TrackingUpdate):Promise<void>},token:string,now:string,id:string):Promise<boolean>;
 ownedActivity<T>(repo:{owned(user:string,id:string):Promise<boolean>;list(user:string,id:string):Promise<T>},user:string,id:string):Promise<T|null>;
};
export default core;
