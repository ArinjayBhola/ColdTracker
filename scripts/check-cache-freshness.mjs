import assert from "node:assert/strict";
import { QueryClient, QueryObserver, hydrate } from "@tanstack/react-query";
import createLoader from "./reliability-test-loader.cjs";

const load = createLoader();
const { ServerQuerySnapshot } = load("components/server-query-snapshot.tsx");
const { invalidateOutreachLists } = load("lib/outreach-cache.ts");
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const key = ["outreach", "fixture"];
try {
  client.setQueryData(key,{notes:"old"},{updatedAt:1000});
  const legacy = new QueryObserver(client,{queryKey:key,enabled:false,initialData:{notes:"fresh server"}});
  assert.equal(legacy.getCurrentResult().data.notes,"old","baseline: initialData ignores fresh props when a cache entry exists");
  function snapshot(data,updatedAt) {
    const element = ServerQuerySnapshot({queryKey:key,data,updatedAt,children:null});
    hydrate(client,element.props.state);
  }
  snapshot({notes:"fresh server"},2000);
  assert.equal(client.getQueryData(key).notes,"fresh server");
  snapshot({notes:"older response"},1500);
  assert.equal(client.getQueryData(key).notes,"fresh server","older navigation snapshots cannot overwrite newer cache data");
  client.setQueryData(key,{notes:"local save"},{updatedAt:3000});
  snapshot({notes:"pre-save snapshot"},2500);
  assert.equal(client.getQueryData(key).notes,"local save");
  client.setQueryData(["follow-ups","owner"],{items:[]});
  client.setQueryData(["stats","owner","UTC"],{total:1});
  client.setQueryData(["notifications","owner"],{count:0});
  await invalidateOutreachLists(client);
  assert.equal(client.getQueryState(["follow-ups","owner"]).isInvalidated,true);
  assert.equal(client.getQueryState(["stats","owner","UTC"]).isInvalidated,true);
  assert.equal(client.getQueryState(["notifications","owner"]).isInvalidated,false);
  let fetches=0;
  const observer = new QueryObserver(client,{queryKey:["freshness-test"],queryFn:async()=>({version:++fetches}),staleTime:60000,refetchOnMount:true});
  client.setQueryData(["freshness-test"],{version:0});
  let unsubscribe=observer.subscribe(()=>{});
  assert.equal(fetches,0,"fresh mounts do not duplicate requests");
  unsubscribe();
  await client.invalidateQueries({queryKey:["freshness-test"]});
  assert.equal(fetches,0,"inactive entries are marked stale without fetching");
  unsubscribe=observer.subscribe(()=>{});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetches,1,"a stale mount revalidates once");
  unsubscribe();
  console.log("Cache checks passed: baseline reproduced, newer server hydration, older snapshot guard, mutation invalidation, fresh/stale mount request counts.");
} finally { client.clear(); }
