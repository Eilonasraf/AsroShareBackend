import { Request, Response } from 'express';
import postModel, { IPost } from '../models/Post';
import baseController from './baseController';

class PostsController extends baseController<IPost> {
    constructor() {
        super(postModel);
    }

    async createPost (req: Request, res: Response) {
        const senderId = req.params.userId;
        const post = {
            title: req.body.title,
            content: req.body.content,
            sender: senderId
        }
        req.body = post;
        super.create(req, res);
    };

    async getPosts (req: Request, res: Response) {
        super.getAll(req, res, "");

    };

    async getPostById (req: Request, res: Response): Promise<void> {
        super.getById(req, res);
    };

    async getPostsBySender (req: Request, res: Response) {
        super.getAll(req, res, 'sender');
    }

    async updatePost (req: Request, res: Response): Promise<void> {
        const body = req.body;
        const post = {
            title: body.title,
            content: body.content,
            sender: body.sender
        };
        req.body = post;
        super.update(req, res);
    };
};


export default new PostsController();

