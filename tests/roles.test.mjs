import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRole, canManageAccount } from '../src/lib/roles.ts';
test('Only owner-table membership creates admin privileges',()=>{
 assert.equal(resolveRole(false,{court_role:'admin'}),'user');
 assert.equal(resolveRole(true,{court_role:'supervisor'}),'admin');
 assert.equal(resolveRole(false,{court_role:'supervisor'}),'supervisor');
 assert.equal(resolveRole(false,{}),'user');
});
test('Ordinary users have no staff account actions',()=>{
 for(const target of ['user','supervisor','admin'])for(const action of ['create','role','password','delete'])assert.equal(canManageAccount('user',target,action),false);
});
test('Supervisors can manage ordinary accounts but cannot create or assign roles',()=>{
 assert.equal(canManageAccount('supervisor','user','password'),true);
 assert.equal(canManageAccount('supervisor','user','delete'),true);
 for(const target of ['user','supervisor','admin'])for(const action of ['create','role'])assert.equal(canManageAccount('supervisor',target,action),false);
 for(const action of ['password','delete'])assert.equal(canManageAccount('supervisor','admin',action),false);
 assert.equal(canManageAccount('supervisor','supervisor','password'),true);
 assert.equal(canManageAccount('supervisor','supervisor','delete'),true);
 assert.equal(canManageAccount('supervisor','supervisor','delete',true),false);
});
test('Admins assign supervisor roles and protect their own account',()=>{
 assert.equal(canManageAccount('admin','supervisor','create'),true);
 assert.equal(canManageAccount('admin','user','role'),true);
 assert.equal(canManageAccount('admin','supervisor','password'),true);
 assert.equal(canManageAccount('admin','supervisor','delete'),true);
 assert.equal(canManageAccount('admin','admin','delete',true),false);
 assert.equal(canManageAccount('admin','admin','role',true),false);
 assert.equal(canManageAccount('admin','admin','password',true),true);
});
