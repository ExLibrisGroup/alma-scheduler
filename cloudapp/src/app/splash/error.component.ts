import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

@Component({
  template: `<p>{{msg}}</p>`
})
export class ErrorComponent  {
  msg: string;

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.msg = this.route.snapshot.paramMap.get('msg');
  }
}
