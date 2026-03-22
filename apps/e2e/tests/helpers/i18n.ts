export interface Labels {
  auth: {
    loginSubmit: string;
    registerSubmit: string;
    displayName: string;
    email: string;
    password: string;
    confirmCode: string;
    confirmSubmit: string;
    passwordError: string;
    duplicateEmail: string;
    invalidCredentials: RegExp;
    invalidCode: RegExp;
  };
  dogs: {
    empty: string;
    addDog: string;
    newTitle: string;
    register: string;
    name: string;
    breed: string;
    edit: string;
    delete: string;
    deleteTitle: string;
    editTitle: string;
    update: string;
    cancel: RegExp;
    walks: string;
    distance: string;
    duration: string;
  };
  signOut: RegExp;
}

const ja: Labels = {
  auth: {
    loginSubmit: 'ログイン',
    registerSubmit: 'アカウントを作成',
    displayName: '表示名',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmCode: '確認コード',
    confirmSubmit: '確認',
    passwordError: '8文字以上で入力してください',
    duplicateEmail: 'このメールアドレスは既に登録されています',
    invalidCredentials: /メールアドレスまたはパスワードが正しくありません|ログインに失敗しました/,
    invalidCode: /確認コードが正しくありません|確認に失敗しました/,
  },
  dogs: {
    empty: 'まだ犬が登録されていません',
    addDog: '犬を追加',
    newTitle: '新しい犬を登録',
    register: '登録',
    name: '名前',
    breed: '犬種',
    edit: '編集',
    delete: '削除',
    deleteTitle: '犬を削除',
    editTitle: '犬のプロフィールを編集',
    update: '更新',
    cancel: /キャンセル|Cancel/,
    walks: '散歩',
    distance: '距離',
    duration: '時間',
  },
  signOut: /サインアウト|ログアウト|Sign Out|Logout/i,
};

const en: Labels = {
  auth: {
    loginSubmit: 'Login',
    registerSubmit: 'Create Account',
    displayName: 'Display Name',
    email: 'Email',
    password: 'Password',
    confirmCode: 'Confirmation Code',
    confirmSubmit: 'Confirm',
    passwordError: 'Must be at least 8 characters',
    duplicateEmail: 'This email is already registered',
    invalidCredentials: /Invalid email or password|Login failed/,
    invalidCode: /Invalid confirmation code|Verification failed/,
  },
  dogs: {
    empty: 'No dogs registered yet',
    addDog: 'Add Dog',
    newTitle: 'Register New Dog',
    register: 'Register',
    name: 'Name',
    breed: 'Breed',
    edit: 'Edit',
    delete: 'Delete',
    deleteTitle: 'Delete Dog',
    editTitle: 'Edit Dog Profile',
    update: 'Update',
    cancel: /キャンセル|Cancel/,
    walks: 'Walks',
    distance: 'Distance',
    duration: 'Duration',
  },
  signOut: /サインアウト|ログアウト|Sign Out|Logout/i,
};

const localeMap: Record<string, Labels> = { ja, en };

export function getLabels(locale: string): Labels {
  const key = locale.split('-')[0];
  return localeMap[key] ?? ja;
}
