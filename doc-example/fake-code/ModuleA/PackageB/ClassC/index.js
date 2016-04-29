// Content of class C
export default ClassC {
  constructor() {
    this.data = [];
  }

  add(v) {
    this.data.push(v);
  }

  clear() {
    this.data = [];
  }

  list() {
    return this.data;
  }
}
