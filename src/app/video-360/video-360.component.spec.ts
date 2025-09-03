import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Video360Component } from './video-360.component';

describe('Video360Component', () => {
  let component: Video360Component;
  let fixture: ComponentFixture<Video360Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Video360Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Video360Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
