import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseSplitController } from './expense-split.controller.js';
import { ExpenseSplitService } from './expense-split.service.js';

describe('ExpenseSplitController', () => {
  let controller: ExpenseSplitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseSplitController],
      providers: [ExpenseSplitService],
    }).compile();

    controller = module.get<ExpenseSplitController>(ExpenseSplitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
