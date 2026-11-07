import {expect,it,vi} from 'vitest';
import {AI_AVAILABLE,AI_UNAVAILABLE_REASON} from '../../src/lib/ai/availability';
import {chatCompletion,transcribeAudio} from '../../src/lib/ai/client';
import {loadAICopilotConfig,saveAICopilotConfig} from '../../src/lib/ai/secureConfig';
const secure=vi.hoisted(()=>({get:vi.fn(),set:vi.fn()}));
vi.mock('expo-file-system/legacy',()=>({uploadAsync:vi.fn()}));
vi.mock('expo-secure-store',()=>({getItemAsync:secure.get,setItemAsync:secure.set,deleteItemAsync:vi.fn()}));
vi.mock('react-native',()=>({Platform:{OS:'android'}}));
it('does not read credentials, save new keys, or call providers in the actual V1 configuration',async()=>{
  const request=vi.fn();vi.stubGlobal('fetch',request);
  try {
    expect(AI_AVAILABLE).toBe(false);expect(await loadAICopilotConfig()).toBeNull();expect(secure.get).not.toHaveBeenCalled();
    const config={apiKey:'test-only',baseUrl:'https://provider.invalid/v1',model:'test'};
    await expect(saveAICopilotConfig(config)).rejects.toThrow(AI_UNAVAILABLE_REASON);expect(secure.set).not.toHaveBeenCalled();
    expect(await chatCompletion(config,[{role:'user',content:'private health entry'}])).toEqual({ok:false,error:AI_UNAVAILABLE_REASON});
    expect(await transcribeAudio(config,'file://private-audio','audio/m4a')).toEqual({ok:false,error:AI_UNAVAILABLE_REASON});
    expect(request).not.toHaveBeenCalled();
  } finally {vi.unstubAllGlobals();}
});
