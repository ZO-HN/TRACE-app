import {expect,it} from 'vitest';
import {captureNutritionRecord,nutritionDay} from '../../src/lib/nutrition/record';
import {sumTodayMacros} from '../../src/lib/dashboard/today';
import {parseQuickEntry} from '../../src/lib/nutrition/parseQuickEntry';
it('preserves the captured diary day through later timestamps/timezones and matches preview/storage precision',()=>{
  const payload=captureNutritionRecord({id:'food',user_id:'a',method:'TYPED',recorded_date:'2026-11-07',logged_at:'2026-11-06T16:05:00Z',calories:200,protein_g:0.15,carbs_g:1.25,fat_g:null});
  expect(payload.protein_g).toBe(0.2);expect(payload.carbs_g).toBe(1.3);expect(payload.recorded_date).toBe('2026-11-07');expect(nutritionDay({...payload,logged_at:payload.logged_at!})).toBe('2026-11-07');
  const total=sumTodayMacros([{...payload,logged_at:payload.logged_at!,calories:200,protein_g:payload.protein_g!,carbs_g:payload.carbs_g!,fat_g:null}],new Date(2026,10,7,12));
  expect(total.calories).toBe(200);expect(total.protein_g).toBe(0.2);expect(parseQuickEntry('0.15g protein').protein_g).toBe(payload.protein_g);
});
it('rejects invalid date/quantity before rounding and leaves the original object unchanged',()=>{
  const original={id:'food',user_id:'a',method:'TYPED' as const,calories:100,protein_g:99999.94};
  expect(()=>captureNutritionRecord(original)).toThrow('99999.9');expect(original.protein_g).toBe(99999.94);
  expect(()=>captureNutritionRecord({...original,protein_g:10,recorded_date:'2026-02-30'})).toThrow('valid nutrition date');
});
