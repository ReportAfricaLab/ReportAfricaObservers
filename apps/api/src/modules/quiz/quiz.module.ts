import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity, QuizQuestionEntity, QuizAttemptEntity, UserEntity } from '../../database/entities';
import { QuizController, AdminQuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuizEntity, QuizQuestionEntity, QuizAttemptEntity, UserEntity])],
  controllers: [QuizController, AdminQuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
