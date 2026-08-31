export class User {
  id: number;
  email: string;
  fullname: string;

  constructor(data: User) {
    this.id = data.id;
    this.email = data.email;
    this.fullname = data.fullname;
  }
}
