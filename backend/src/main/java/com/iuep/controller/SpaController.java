package com.iuep.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA fallback — serves index.html for unknown non-API, non-file routes.
 * Matches the behavior of the Node.js app.get('*') handler.
 */
@Controller
public class SpaController {

    @GetMapping(value = {"/", "/{path:^(?!api|uploads|Figma|ws)[^\\.]*$}"})
    public String forward() {
        return "forward:/index.html";
    }
}
