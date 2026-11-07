import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EmailCodeSignIn from '../../src/components/auth/EmailCodeSignIn';
import { deferred } from '../helpers/renderHook';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput' }));
const api=vi.hoisted(()=>({ send:vi.fn(), verify:vi.fn() }));
vi.mock('../../src/lib/supabase',()=>({ supabase:{ auth:{signInWithOtp:api.send,verifyOtp:api.verify} } }));
let root: ReactTestRenderer;
const button=(text:string)=>root.root.findAllByType('Pressable' as never).find(n=>n.findAllByType('Text' as never).some(t=>String(t.props.children).includes(text)))!;
beforeEach(async()=>{
  api.send.mockReset().mockResolvedValue({error:null}); api.verify.mockReset().mockResolvedValue({error:null});
  await act(async()=>{root=create(createElement(EmailCodeSignIn));});
});
afterEach(async()=>{await act(async()=>root.unmount());});
it('uses the existing onboarding email and verifies its code without creating another user',async()=>{
  await act(async()=>root.root.findByProps({accessibilityLabel:'Invitation email'}).props.onChangeText('client@test.invalid'));
  await act(async()=>button('Send sign-in code').props.onPress());
  expect(api.send).toHaveBeenCalledWith({email:'client@test.invalid',options:{shouldCreateUser:false}});
  expect(button('Resend in').props.disabled).toBe(true);
  await act(async()=>root.root.findByProps({accessibilityLabel:'Email sign-in code'}).props.onChangeText('123456'));
  await act(async()=>button('Verify code').props.onPress());
  expect(api.verify).toHaveBeenCalledWith({email:'client@test.invalid',token:'123456',type:'email'});
});
it('keeps the email and code available after failures and blocks repeated sends',async()=>{
  await act(async()=>root.root.findByProps({accessibilityLabel:'Invitation email'}).props.onChangeText('client@test.invalid'));
  const wait=deferred<{error:null}>();api.send.mockReturnValueOnce(wait.promise);
  await act(async()=>{button('Send sign-in code').props.onPress();button('Send sign-in code').props.onPress();});
  expect(api.send).toHaveBeenCalledTimes(1);
  await act(async()=>wait.resolve({error:null}));
  api.verify.mockRejectedValueOnce(new Error('Expired code'));
  await act(async()=>root.root.findByProps({accessibilityLabel:'Email sign-in code'}).props.onChangeText('123456'));
  await act(async()=>button('Verify code').props.onPress());
  expect(root.root.findByProps({accessibilityRole:'alert'}).props.children).toBe('Expired code');
  expect(root.root.findByProps({accessibilityLabel:'Email sign-in code'}).props.value).toBe('123456');
});
