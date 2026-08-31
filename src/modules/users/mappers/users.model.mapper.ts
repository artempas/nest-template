import {
  ConfiguredModel,
  CreateData,
  IWriteModelMapper,
  UpdateDataInput,
} from '@lib/repositories';
import { User } from '../entities/user.entity';
import { usersRepositoryConfig } from '../repositories/users.rw.repository';

/** Маппер Prisma-payload ↔ доменная модель {@link User}. */
export class UsersModelMapper implements IWriteModelMapper<
  'User',
  typeof usersRepositoryConfig,
  User
> {
  modelToEntity(
    model: ConfiguredModel<'User', typeof usersRepositoryConfig>,
  ): User {
    return new User(model);
  }

  entityToCreateModel(model: User): CreateData<'User'> {
    return {
      id: model.id,
      email: model.email,
      fullname: model.fullname,
    };
  }

  entityToUpdateModel(model: User): UpdateDataInput<'User'> {
    const data: { email?: string; fullname?: string } = {};

    if (model.email !== undefined) {
      data.email = model.email;
    }
    if (model.fullname !== undefined) {
      data.fullname = model.fullname;
    }

    return data;
  }
}
